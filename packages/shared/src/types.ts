// Shared domain types used by both the API and the web app.

export type PayoutCurrency = "USDT" | "NGN" | "GHS";

export type CardMedium = "PHYSICAL" | "ECODE";

export type ReceiptType = "NONE" | "CASH" | "DEBIT";

/** Cached naira-per-unit from NoOnes for each receipt scenario on a rate row. */
export interface StoredQuotes {
  /** Best offer when user has no purchase receipt. */
  NONE?: number;
  /** Best offer when user has a cash receipt. */
  CASH?: number;
  /** Best offer when user has a debit/card receipt. */
  DEBIT?: number;
}

function maxPositive(...values: (number | undefined)[]): number {
  const nums = values.filter((v): v is number => v != null && v > 0);
  return nums.length ? Math.max(...nums) : 0;
}

/** Pick the stored base rate for a receipt choice; falls back to nairaPerUnit. */
export function resolveStoredNairaPerUnit(
  nairaPerUnit: number,
  storedQuotes: StoredQuotes | null | undefined,
  receiptType: ReceiptType = "NONE",
  options?: { ecodeQuotes?: StoredQuotes | null; medium?: CardMedium }
): number {
  const stored = storedQuotes ?? {};
  let rate: number;

  if (receiptType === "NONE") {
    rate = maxPositive(stored.NONE, stored.CASH, stored.DEBIT) || nairaPerUnit;
  } else if (receiptType === "CASH") {
    rate = maxPositive(stored.CASH, stored.DEBIT) || stored.NONE || nairaPerUnit;
  } else {
    rate = maxPositive(stored.DEBIT, stored.CASH) || stored.NONE || nairaPerUnit;
  }

  if (options?.medium === "PHYSICAL" && options.ecodeQuotes) {
    const ecode = options.ecodeQuotes;
    let ecodeRate: number;
    if (receiptType === "NONE") {
      ecodeRate = maxPositive(ecode.NONE, ecode.CASH, ecode.DEBIT);
    } else if (receiptType === "CASH") {
      ecodeRate = maxPositive(ecode.CASH, ecode.DEBIT) || ecode.NONE || 0;
    } else {
      ecodeRate = maxPositive(ecode.DEBIT, ecode.CASH) || ecode.NONE || 0;
    }
    if (ecodeRate > rate) rate = ecodeRate;
  }

  return rate;
}

/** Sort country labels with "Other" always last. */
export function sortCountriesForDisplay(countries: string[]): string[] {
  const rest = countries.filter((c) => c !== "Other").sort();
  if (countries.includes("Other")) rest.push("Other");
  return rest;
}

export interface RateDenomRange {
  minDenom: number | null;
  maxDenom: number | null;
  currency?: string;
}

/** True when a card face amount falls within a rate tier's advertised bounds. */
export function cardAmountInRateRange(amount: number, rate: RateDenomRange): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (rate.minDenom != null && amount < rate.minDenom) return false;
  if (rate.maxDenom != null && amount > rate.maxDenom) return false;
  return true;
}

/** Find the tier whose [min,max] contains the amount, if any. */
export function findRateTierForAmount<T extends RateDenomRange>(tiers: T[], amount: number): T | null {
  return tiers.find((tier) => cardAmountInRateRange(amount, tier)) ?? null;
}

/** Human-readable validation error for an out-of-range amount. */
export function rateAmountRangeError(amount: number, rate: RateDenomRange): string | null {
  if (cardAmountInRateRange(amount, rate)) return null;

  const cur = rate.currency ? ` ${rate.currency}` : "";
  if (rate.minDenom != null && rate.maxDenom != null) {
    return `Amount must be between ${rate.minDenom} and ${rate.maxDenom}${cur} for this offer.`;
  }
  if (rate.minDenom != null) {
    return `Amount must be at least ${rate.minDenom}${cur} for this offer.`;
  }
  if (rate.maxDenom != null) {
    return `Amount must be at most ${rate.maxDenom}${cur} for this offer.`;
  }
  return "Amount is not valid for this offer tier.";
}

export type TradeStatus =
  | "PENDING"
  | "PROCESSING"
  | "INFO_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PAID";

export type WithdrawalStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "PAID";

export type TxnType =
  | "TRADE_CREDIT"
  | "WITHDRAWAL_DEBIT"
  | "TRANSFER_DEBIT"
  | "TRANSFER_CREDIT"
  | "REFERRAL_BONUS"
  | "ADMIN_ADJUSTMENT";

export type UserRole = "USER" | "ADMIN";

// A single structured rate row, e.g. Apple/iTunes, US, $200-$500, physical = 1092 NGN per unit
export interface RateEntry {
  cardType: string; // e.g. "Apple/iTunes"
  country: string; // e.g. "US", "UK", "Other"
  currency: string; // ISO of the card's face value, e.g. "USD", "GBP"
  minDenom: number | null; // null = any
  maxDenom: number | null; // null = any
  medium: CardMedium; // PHYSICAL or ECODE
  nairaPerUnit: number; // NGN paid per 1 unit of card face value (the "slow" rate)
  speed?: "SLOW" | "FAST";
  note?: string;
}

export interface ExchangeRates {
  ngnPerUsdt: number; // NGN per 1 USDT
  ngnPerGhs: number; // NGN per 1 GHS (Cedi)
}

export interface RateReductions {
  nairaReductionPercent: number; // default 20
  fxReductionPercent: number; // default 30 (USDT & Cedi)
}

export interface RateQuoteInput {
  nairaPerUnit: number; // base parsed rate (slow), naira per unit of card currency
  cardAmount: number; // face value amount of the card (in its own currency)
  payoutCurrency: PayoutCurrency;
  medium: CardMedium;
  rates: ExchangeRates;
  reductions: RateReductions;
}

export interface RateQuote {
  payoutCurrency: PayoutCurrency;
  effectiveNairaPerUnit: number; // rate after reduction
  grossNaira: number; // cardAmount * nairaPerUnit (before reduction)
  payoutAmount: number; // final amount paid in payoutCurrency
  reductionPercent: number;
}
