import { CardMedium, Prisma } from "@prisma/client";
import { CardReductionOverrides, RateDenomRange, ReceiptType, cardAmountInRateRange, rateAmountRangeError, resolveStoredNairaPerUnit, StoredQuotes } from "@gc4s/shared";
import { prisma } from "../prisma";
import { parseStoredQuotes } from "./noones/storedQuotes";
import { STT_RATE_SPEED } from "./rateSources";

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

/**
 * The "number of rates" a card + currency's deduction band is read from: the
 * offers SafeTheTrade had for that currency at its last sync, stored on the
 * tier's rate rows (`countryOfferCount`). It is per currency, never the
 * card-wide row count. A currency SafeTheTrade does not price counts 0.
 *
 * Returns null when the card has no SafeTheTrade rates at all (e.g. Sogo-only
 * cards): number-of-rates deductions do not apply to them, so the platform
 * default reductions are used instead of a band's.
 */
export async function deductionRateCountForCard(
  cardTypeId: string,
  currency: string
): Promise<number | null> {
  const sttRows = await prisma.rate.findMany({
    where: { cardTypeId, speed: STT_RATE_SPEED },
    select: { currency: true, countryOfferCount: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!sttRows.length) return null;
  const row = sttRows.find((r) => r.currency === currency);
  return row?.countryOfferCount ?? 0;
}

/**
 * A card's deduction overrides for one face currency (`CardCurrencyReduction`),
 * or null when the admin has not set any for it. Layered above the card-wide
 * `CardType.*ReductionPercent` overrides at quote time.
 */
export async function currencyReductionForCard(
  cardTypeId: string,
  currency: string
): Promise<CardReductionOverrides | null> {
  return prisma.cardCurrencyReduction.findUnique({
    where: { cardTypeId_currency: { cardTypeId, currency } },
    select: {
      nairaReductionPercent: true,
      usdtReductionPercent: true,
      ghsReductionPercent: true,
    },
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
