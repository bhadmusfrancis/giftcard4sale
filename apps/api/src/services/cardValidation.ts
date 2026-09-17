import { prisma } from "../prisma";
import { readUploadedFile } from "../lib/upload";
import {
  fingerprintImage,
  hammingDistanceHex,
  hashGiftCardCode,
  parsePastedCodes,
  codeLast4,
  type ImageFingerprint,
} from "./cardFingerprint";
import { ocrGiftCardImage } from "./cardOcr";

// Trades in these statuses count as "consuming" a card/code for duplicate
// detection. REJECTED is included on purpose: a rejected card/code must not be
// resubmitted. CANCELLED is excluded — the seller withdrew that trade before a
// verdict, so the card was never consumed.
const DUPLICATE_BLOCKING_STATUSES = ["PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID"] as const;
const PERCEPTUAL_HASH_MAX_DISTANCE = 5;

export interface AnalyzedCardFile {
  file: Express.Multer.File;
  isReceipt: boolean;
  fingerprint?: ImageFingerprint;
  ocrText?: string;
  extractedCodes: string[];
}

export interface CodeEntry {
  normalized: string;
  hash: string;
  source: "PASTED" | "OCR";
}

export type DuplicateKind = "CODE" | "IMAGE_EXACT" | "IMAGE_DIMENSIONS" | "IMAGE_PERCEPTUAL";

export interface DuplicateMatch {
  kind: DuplicateKind;
  // HARD = definitive proof the same card was already submitted (exact code or
  // byte-identical image) -> safe to auto-reject. SOFT = probabilistic signal
  // (similar-looking image, coincidental dimensions) -> flag for admin review
  // only; different cards of the same brand legitimately trip these.
  severity: "HARD" | "SOFT";
  reason: string;
  priorTradeNumber: string;
  priorTradeId: string;
}

export interface SubmissionAnalysis {
  cardFiles: AnalyzedCardFile[];
  codes: CodeEntry[];
  // Definitive duplicates — auto-reject.
  duplicates: DuplicateMatch[];
  // Probable-but-unproven matches — keep the trade PENDING and flag for review.
  reviewFlags: DuplicateMatch[];
}

async function analyzeCardFile(file: Express.Multer.File, isReceipt: boolean): Promise<AnalyzedCardFile> {
  const base: AnalyzedCardFile = { file, isReceipt, extractedCodes: [] };
  if (isReceipt) return base;

  try {
    const buffer = await readUploadedFile(file);
    const fingerprint = await fingerprintImage(buffer);
    const ocr = await ocrGiftCardImage(buffer);
    return {
      ...base,
      fingerprint,
      ocrText: ocr.ocrText || undefined,
      extractedCodes: ocr.extractedCodes,
    };
  } catch (err) {
    console.error("[cardValidation] file analysis failed:", (err as Error).message);
    return base;
  }
}

function buildCodeEntries(pastedText: string | undefined, analyzedFiles: AnalyzedCardFile[]): CodeEntry[] {
  const map = new Map<string, CodeEntry>();

  for (const norm of parsePastedCodes(pastedText)) {
    map.set(norm, { normalized: norm, hash: hashGiftCardCode(norm), source: "PASTED" });
  }

  for (const af of analyzedFiles) {
    for (const norm of af.extractedCodes) {
      if (!map.has(norm)) {
        map.set(norm, { normalized: norm, hash: hashGiftCardCode(norm), source: "OCR" });
      }
    }
  }

  return [...map.values()];
}

async function findCodeDuplicate(hashes: string[]): Promise<DuplicateMatch | null> {
  if (!hashes.length) return null;

  const hit = await prisma.submittedCardCode.findFirst({
    where: {
      codeHash: { in: hashes },
      trade: { status: { in: [...DUPLICATE_BLOCKING_STATUSES] } },
    },
    include: { trade: { select: { id: true, tradeNumber: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!hit) return null;

  const masked = hit.codeLast4 ? `…${hit.codeLast4}` : "a prior code";
  return {
    kind: "CODE",
    severity: "HARD",
    reason: `Gift card code ${masked} was already submitted in trade ${hit.trade.tradeNumber}. Re-submitting used codes is not allowed.`,
    priorTradeNumber: hit.trade.tradeNumber,
    priorTradeId: hit.trade.id,
  };
}

async function findImageMatches(
  fingerprints: ImageFingerprint[]
): Promise<{ hard: DuplicateMatch[]; soft: DuplicateMatch[] }> {
  const hard: DuplicateMatch[] = [];
  const soft: DuplicateMatch[] = [];

  for (const fp of fingerprints) {
    const exact = await prisma.tradeAttachment.findFirst({
      where: {
        contentHash: fp.contentHash,
        trade: { status: { in: [...DUPLICATE_BLOCKING_STATUSES] } },
        NOT: { filename: { startsWith: "receipt-" } },
      },
      include: { trade: { select: { id: true, tradeNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (exact) {
      hard.push({
        kind: "IMAGE_EXACT",
        severity: "HARD",
        reason: `An identical gift card image was already uploaded in trade ${exact.trade.tradeNumber} (exact file match).`,
        priorTradeNumber: exact.trade.tradeNumber,
        priorTradeId: exact.trade.id,
      });
      continue;
    }

    if (fp.imageWidth > 0 && fp.imageHeight > 0 && fp.fileSizeBytes > 0) {
      const dimMatch = await prisma.tradeAttachment.findFirst({
        where: {
          imageWidth: fp.imageWidth,
          imageHeight: fp.imageHeight,
          fileSizeBytes: fp.fileSizeBytes,
          trade: { status: { in: [...DUPLICATE_BLOCKING_STATUSES] } },
          NOT: { filename: { startsWith: "receipt-" } },
        },
        include: { trade: { select: { id: true, tradeNumber: true } } },
        orderBy: { createdAt: "desc" },
      });
      if (dimMatch) {
        soft.push({
          kind: "IMAGE_DIMENSIONS",
          severity: "SOFT",
          reason: `A gift card image with the same resolution (${fp.imageWidth}×${fp.imageHeight}px) and file size was already submitted in trade ${dimMatch.trade.tradeNumber}.`,
          priorTradeNumber: dimMatch.trade.tradeNumber,
          priorTradeId: dimMatch.trade.id,
        });
      }
    }

    if (fp.perceptualHash) {
      const candidates = await prisma.tradeAttachment.findMany({
        where: {
          perceptualHash: { not: null },
          trade: { status: { in: [...DUPLICATE_BLOCKING_STATUSES] } },
          NOT: { filename: { startsWith: "receipt-" } },
        },
        select: {
          perceptualHash: true,
          trade: { select: { id: true, tradeNumber: true } },
        },
        take: 500,
        orderBy: { createdAt: "desc" },
      });

      for (const c of candidates) {
        if (!c.perceptualHash) continue;
        const dist = hammingDistanceHex(fp.perceptualHash, c.perceptualHash);
        if (dist <= PERCEPTUAL_HASH_MAX_DISTANCE) {
          soft.push({
            kind: "IMAGE_PERCEPTUAL",
            severity: "SOFT",
            reason: `This gift card photo closely matches an image from trade ${c.trade.tradeNumber} (visual fingerprint match).`,
            priorTradeNumber: c.trade.tradeNumber,
            priorTradeId: c.trade.id,
          });
          break;
        }
      }
    }
  }

  return { hard, soft };
}

export async function analyzeCardSubmission(input: {
  cardFiles: Express.Multer.File[];
  receiptFiles: Express.Multer.File[];
  ecodes?: string;
}): Promise<SubmissionAnalysis> {
  const allFiles = [
    ...input.cardFiles.map((f) => ({ file: f, isReceipt: false })),
    ...input.receiptFiles.map((f) => ({ file: f, isReceipt: true })),
  ];

  const cardFiles = await Promise.all(
    allFiles.map(({ file, isReceipt }) => analyzeCardFile(file, isReceipt))
  );

  const codes = buildCodeEntries(input.ecodes, cardFiles);
  const fingerprints = cardFiles
    .filter((f) => !f.isReceipt && f.fingerprint)
    .map((f) => f.fingerprint!);

  const duplicates: DuplicateMatch[] = [];
  const reviewFlags: DuplicateMatch[] = [];

  const codeDup = await findCodeDuplicate(codes.map((c) => c.hash));
  if (codeDup) duplicates.push(codeDup);

  const imageMatches = await findImageMatches(fingerprints);
  duplicates.push(...imageMatches.hard);
  reviewFlags.push(...imageMatches.soft);

  return { cardFiles, codes, duplicates, reviewFlags };
}

export function attachmentCreateData(af: AnalyzedCardFile, url: string, filename: string) {
  const fp = af.fingerprint;
  return {
    url,
    filename,
    contentHash: fp?.contentHash ?? null,
    imageWidth: fp?.imageWidth ?? null,
    imageHeight: fp?.imageHeight ?? null,
    fileSizeBytes: fp?.fileSizeBytes ?? null,
    perceptualHash: fp?.perceptualHash ?? null,
    ocrText: af.ocrText ?? null,
    extractedCodes: af.extractedCodes.length ? af.extractedCodes : undefined,
  };
}

export function submittedCodeCreateData(codes: CodeEntry[]) {
  return codes.map((c) => ({
    codeHash: c.hash,
    codeLast4: codeLast4(c.normalized),
    source: c.source,
  }));
}

export function primaryDuplicateReason(duplicates: DuplicateMatch[]): string {
  if (!duplicates.length) return "";
  return duplicates[0].reason;
}
