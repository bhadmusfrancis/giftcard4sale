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

/**
 * Stored reference for an uploaded file: the object key (e.g. "uploads/x.jpg").
 * Never a public URL — bucket contents stay private and are only reachable
 * through signed /api/media URLs minted by mediaUrl().
 */
export function fileRef(file: Express.Multer.File): string {
  if (useS3) {
    return (file as Express.MulterS3.File).key;
  }
  return `uploads/${file.filename}`;
}

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/** Object-key prefixes this service is allowed to serve. */
const SERVE_PREFIXES = ["uploads/"];

function isServableKey(k: string): boolean {
  return KEY_RE.test(k) && !k.includes("..") && SERVE_PREFIXES.some((p) => k.startsWith(p));
}

// Hosts that historically produced absolute URLs stored in the DB. Any match
// means "this URL points at our object storage" — extract the key and re-serve
// it signed instead of treating it as an external link.
function ownedHosts(): Set<string> {
  const hosts = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw) return;
    try {
      hosts.add(new URL(raw).host);
    } catch {
      /* ignore malformed env values */
    }
  };
  add(env.s3.publicUrl);
  add(env.s3.endpoint);
  add(env.apiUrl);
  return hosts;
}

/**
 * Resolve a stored value to a servable object key, or null when it is an
 * external URL (e.g. CardType.imageUrl pointing at another site). Handles:
 *  - bare keys:                 "uploads/x.jpg"
 *  - legacy public R2 URLs:     "https://pub-xxx.r2.dev/uploads/x.jpg"
 *  - custom-domain/CDN URLs:    "<S3_PUBLIC_URL>/uploads/x.jpg"
 *  - path-style S3 URLs:        "<S3_ENDPOINT>/<bucket>/uploads/x.jpg"
 *  - legacy local-disk URLs:    "<API_URL>/uploads/x.jpg"
 */
export function keyFromRef(ref: string): string | null {
  if (!ref) return null;
  let key = ref.trim();

  if (/^https?:\/\//i.test(key)) {
    let u: URL;
    try {
      u = new URL(key);
    } catch {
      return null;
    }
    const owned = ownedHosts().has(u.host) || u.host.endsWith(".r2.dev");
    if (!owned) return null;
    key = decodeURIComponent(u.pathname).replace(/^\/+/, "");

    // Strip a path prefix baked into S3_PUBLIC_URL (custom domain w/ base path).
    if (env.s3.publicUrl) {
      try {
        const prefix = new URL(env.s3.publicUrl).pathname.replace(/^\/+|\/+$/g, "");
        if (prefix && (key === prefix || key.startsWith(`${prefix}/`))) {
          key = key.slice(prefix.length).replace(/^\/+/, "");
        }
      } catch {
        /* ignore */
      }
    }
    // Strip bucket name from path-style endpoint URLs.
    if (env.s3.bucket && key.startsWith(`${env.s3.bucket}/`)) {
      key = key.slice(env.s3.bucket.length + 1);
    }
  }

  return isServableKey(key) ? key : null;
}

function sign(key: string, exp: number): string {
  return crypto
    .createHmac("sha256", env.media.signingSecret)
    .update(`${exp}.${key}`)
    .digest("hex");
}

/**
 * Mint a short-lived URL for a stored reference. The signature — not the
 * caller's session — is the access token, so the result can be dropped into
 * <img src> / <a href> without extra headers. External URLs pass through
 * untouched.
 */
export function mediaUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const key = keyFromRef(ref);
  if (!key) return ref;
  const exp = Math.floor(Date.now() / 1000) + env.media.urlTtlSeconds;
  return `${env.apiUrl}/api/media/${key}?e=${exp}&s=${sign(key, exp)}`;
}

/** Verify a signed media request; returns the key when valid. */
export function verifyMediaSignature(key: string, exp: number, sig: string): string | null {
  if (!isServableKey(key) || !Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  if (!/^[a-f0-9]{64}$/i.test(sig)) return null;
  const expected = sign(key, exp);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? key : null;
}

export interface MediaObject {
  body: NodeJS.ReadableStream;
  contentType?: string;
  contentLength?: number;
}

const DISK_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

/** Fetch an object for the signed media endpoint (S3 or local disk). */
export async function getMediaObject(key: string): Promise<MediaObject | null> {
  if (useS3 && s3Client) {
    try {
      const out = await s3Client.send(
        new GetObjectCommand({ Bucket: env.s3.bucket, Key: key })
      );
      if (!out.Body) return null;
      return {
        body: out.Body as NodeJS.ReadableStream,
        contentType: out.ContentType || undefined,
        contentLength: out.ContentLength,
      };
    } catch (err) {
      const code = (err as { name?: string }).name;
      if (code === "NoSuchKey" || code === "NotFound") return null;
      throw err;
    }
  }

  const filePath = path.join(UPLOAD_DIR, key.replace(/^uploads\//, ""));
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  return {
    body: fs.createReadStream(filePath),
    contentType: DISK_MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    contentLength: stat.size,
  };
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

  const localName = file.filename;
  const filePath = path.join(UPLOAD_DIR, localName);
  if (!fs.existsSync(filePath)) throw new Error("Uploaded file not found on disk");
  return fs.readFileSync(filePath);
}

export { UPLOAD_DIR };
