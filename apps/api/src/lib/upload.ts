import multer, { StorageEngine } from "multer";
import multerS3 from "multer-s3";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../env";

const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

export const useS3 = Boolean(env.s3.bucket);

let s3Client: S3Client | null = null;
if (useS3) {
  s3Client = new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint || undefined,
    forcePathStyle: env.s3.forcePathStyle || Boolean(env.s3.endpoint),
    credentials:
      env.s3.accessKeyId && env.s3.secretAccessKey
        ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
        : undefined,
  });
} else if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function key(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  return `uploads/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
}

const storage: StorageEngine = useS3
  ? multerS3({
      s3: s3Client!,
      bucket: env.s3.bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => cb(null, key(file.originalname)),
    })
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => cb(null, key(file.originalname).replace("uploads/", "")),
    });

export const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB per file
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp|gif)/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

/** Trade chat: images and PDFs. */
export const chatUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      /image\/(png|jpe?g|webp|gif)/.test(file.mimetype) || file.mimetype === "application/pdf";
    if (ok) cb(null, true);
    else cb(new Error("Only image and PDF files are allowed"));
  },
});

// Build the public URL for an uploaded file (S3 or local disk).
export function fileUrl(file: Express.Multer.File): string {
  if (useS3) {
    const s3file = file as Express.MulterS3.File;
    if (env.s3.publicUrl) return `${env.s3.publicUrl.replace(/\/$/, "")}/${s3file.key}`;
    return s3file.location;
  }
  return `${env.apiUrl}/uploads/${file.filename}`;
}

/** Read bytes from a multer upload (local disk or S3). */
export async function readUploadedFile(file: Express.Multer.File): Promise<Buffer> {
  const diskPath = (file as Express.Multer.File & { path?: string }).path;
  if (diskPath && fs.existsSync(diskPath)) {
    return fs.readFileSync(diskPath);
  }

  const s3Key = (file as Express.MulterS3.File).key;
  if (useS3 && s3Client && s3Key) {
    const out = await s3Client.send(
      new GetObjectCommand({ Bucket: env.s3.bucket, Key: s3Key })
    );
    const bytes = await out.Body?.transformToByteArray();
    if (bytes) return Buffer.from(bytes);
  }

  const url = fileUrl(file);
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to read uploaded file (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  const localName = url.replace(/^.*\/uploads\//, "");
  const filePath = path.join(UPLOAD_DIR, localName);
  if (!fs.existsSync(filePath)) throw new Error("Uploaded file not found on disk");
  return fs.readFileSync(filePath);
}

export { UPLOAD_DIR };
