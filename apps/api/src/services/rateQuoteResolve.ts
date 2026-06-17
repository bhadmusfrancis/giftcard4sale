import { RateDenomRange, ReceiptType, cardAmountInRateRange, rateAmountRangeError, resolveStoredNairaPerUnit, StoredQuotes } from "@gc4s/shared";
import { parseStoredQuotes } from "./noones/storedQuotes";

export function receiptTypeForQuote(params: {
  receiptType?: ReceiptType;
  preferNoReceipt?: boolean;
}): ReceiptType {
  if (params.receiptType) return params.receiptType;
  if (params.preferNoReceipt) return "NONE";
  return "CASH";
}

export function storedNairaFromRate(
  rate: { nairaPerUnit: number | { toString(): string }; storedQuotes?: unknown; medium?: string },
  receiptType: ReceiptType,
  options?: { ecodeRate?: { nairaPerUnit: number | { toString(): string }; storedQuotes?: unknown } | null }
): number {
  const base = Number(rate.nairaPerUnit);
  const ecodeQuotes = options?.ecodeRate ? parseStoredQuotes(options.ecodeRate.storedQuotes) : null;
  return resolveStoredNairaPerUnit(base, parseStoredQuotes(rate.storedQuotes), receiptType, {
    medium: rate.medium as "PHYSICAL" | "ECODE" | undefined,
    ecodeQuotes: rate.medium === "PHYSICAL" ? ecodeQuotes : null,
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
