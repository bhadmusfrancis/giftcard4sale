import crypto from "crypto";
import { prisma } from "../prisma";

function randomSuffix(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

/** Generate a unique human-readable trade reference (GC4S-YYYYMMDD-XXXXXX). */
export async function generateTradeNumber(): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  for (let i = 0; i < 10; i++) {
    const tradeNumber = `GC4S-${datePart}-${randomSuffix()}`;
    const existing = await prisma.trade.findUnique({ where: { tradeNumber } });
    if (!existing) return tradeNumber;
  }
  return `GC4S-${datePart}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
