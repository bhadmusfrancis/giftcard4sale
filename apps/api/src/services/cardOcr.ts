import { createWorker, Worker } from "tesseract.js";
import sharp from "sharp";
import { extractCodesFromOcrText } from "./cardFingerprint";

let workerPromise: Promise<Worker> | null = null;
let workerQueue: Promise<void> = Promise.resolve();

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng", 1, {
        logger: () => {},
      });
      return worker;
    })();
  }
  return workerPromise;
}

async function preprocessForOcr(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

export interface OcrResult {
  ocrText: string;
  extractedCodes: string[];
}

export async function ocrGiftCardImage(buffer: Buffer): Promise<OcrResult> {
  return enqueueOcr(async () => {
    try {
      const prepped = await preprocessForOcr(buffer);
      const worker = await getWorker();
      const { data } = await worker.recognize(prepped);
      const ocrText = (data.text || "").trim();
      const extractedCodes = extractCodesFromOcrText(ocrText);
      return { ocrText, extractedCodes };
    } catch (err) {
      console.error("[ocr] gift card scan failed:", (err as Error).message);
      return { ocrText: "", extractedCodes: [] };
    }
  });
}

function enqueueOcr<T>(fn: () => Promise<T>): Promise<T> {
  const run = workerQueue.then(fn, fn);
  workerQueue = run.then(
    () => {},
    () => {}
  );
  return run;
}
