import { CardMedium, Prisma } from "@prisma/client";
import { RateDenomRange, ReceiptType, cardAmountInRateRange, rateAmountRangeError, resolveStoredNairaPerUnit, StoredQuotes } from "@gc4s/shared";
import { prisma } from "../prisma";
import { parseStoredQuotes } from "./noones/storedQuotes";

export function receiptTypeForQuote(params: {
  receiptType?: ReceiptType;
  preferNoReceipt?: boolean;
}): ReceiptType {
  if (params.receiptType) return params.receiptType;
  if (params.preferNoReceipt) return "NONE";
  return "CASH";
}

type StoredRate = { nairaPerUnit: number | { toString(): string }; storedQuotes?: unknown };

export function storedNairaFromRate(
  rate: StoredRate & { medium?: string },
  receiptType: ReceiptType,
  options?: { physicalRate?: StoredRate | null }
): number {
  const physical = rate.medium === "ECODE" ? options?.physicalRate : null;
  return resolveStoredNairaPerUnit(Number(rate.nairaPerUnit), parseStoredQuotes(rate.storedQuotes), receiptType, {
    medium: rate.medium as "PHYSICAL" | "ECODE" | undefined,
    physicalQuotes: physical ? parseStoredQuotes(physical.storedQuotes) : null,
    physicalNairaPerUnit: physical ? Number(physical.nairaPerUnit) : undefined,
  });
}

/**
 * The active physical rate an e-code row is capped at — same card, country
 * and denomination band. Null for physical rows.
 */
export async function findPhysicalSibling(rate: {
  cardTypeId: string;
  country: string;
  medium: CardMedium;
  minDenom: number | null;
  maxDenom: number | null;
}): Promise<{ nairaPerUnit: Prisma.Decimal; storedQuotes: Prisma.JsonValue } | null> {
  if (rate.medium !== "ECODE") return null;
  return prisma.rate.findFirst({
    where: {
      cardTypeId: rate.cardTypeId,
      country: rate.country,
      medium: "PHYSICAL",
      minDenom: rate.minDenom,
      maxDenom: rate.maxDenom,
      active: true,
    },
    select: { nairaPerUnit: true, storedQuotes: true },
  });
}

export function validateCardAmountForRate(
  amount: number,
  rate: RateDenomRange & { currency?: string }
): string | null {
  return rateAmountRangeError(amount, rate);
}

export { cardAmountInRateRange };

export type { StoredQuotes };
