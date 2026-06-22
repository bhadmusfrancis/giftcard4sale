import crypto from "crypto";
import sharp from "sharp";

export interface ImageFingerprint {
  contentHash: string;
  imageWidth: number;
  imageHeight: number;
  fileSizeBytes: number;
  perceptualHash: string;
}

/** Normalize a gift-card code for hashing and comparison. */
export function normalizeGiftCardCode(raw: string): string {
  return raw.replace(/[\s\-_]/g, "").toUpperCase();
}

export function hashGiftCardCode(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/** Split pasted e-codes into individual codes. */
export function parsePastedCodes(text: string | undefined | null): string[] {
  if (!text?.trim()) return [];
  const parts = text
    .split(/[\n\r,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const norm = normalizeGiftCardCode(part);
    if (norm.length < 4 || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

/** Extract likely gift-card codes from OCR text. */
export function extractCodesFromOcrText(text: string): string[] {
  if (!text?.trim()) return [];
  const candidates = new Set<string>();

  const patterns = [
    /\b[A-Z0-9]{4}(?:[\s\-][A-Z0-9]{4}){2,7}\b/gi,
    /\b[A-Z0-9]{12,32}\b/gi,
    /\b[0-9]{4}(?:[\s\-][0-9]{4}){2,7}\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const norm = normalizeGiftCardCode(match[0]);
      if (norm.length >= 8 && norm.length <= 40) candidates.add(norm);
    }
  }

  return [...candidates];
}

/** Difference hash (dHash) for near-duplicate image detection. */
export async function fingerprintImage(buffer: Buffer): Promise<ImageFingerprint> {
  const fileSizeBytes = buffer.length;
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const meta = await sharp(buffer).metadata();
  const imageWidth = meta.width ?? 0;
  const imageHeight = meta.height ?? 0;

  const gray = await sharp(buffer)
    .rotate()
    .resize(9, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  let hash = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = gray[y * 9 + x];
      const right = gray[y * 9 + x + 1];
      hash = (hash << 1n) | (left < right ? 1n : 0n);
    }
  }
  const perceptualHash = hash.toString(16).padStart(16, "0");

  return { contentHash, imageWidth, imageHeight, fileSizeBytes, perceptualHash };
}

/** Hamming distance between two hex dHash strings. */
export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  const av = BigInt(`0x${a}`);
  const bv = BigInt(`0x${b}`);
  let xor = av ^ bv;
  let dist = 0;
  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }
  return dist;
}

export function codeLast4(normalized: string): string {
  return normalized.length >= 4 ? normalized.slice(-4) : normalized;
}
