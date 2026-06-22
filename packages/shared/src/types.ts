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

/** Sort country labels by NoOnes offer count (highest first). "Other" is always last. */
export function sortCountriesForDisplay(
  countries: string[],
  offerCountByCountry?: Record<string, number>
): string[] {
  const rest = countries.filter((c) => c !== "Other");

  if (offerCountByCountry) {
    rest.sort((a, b) => {
      const diff = (offerCountByCountry[b] ?? 0) - (offerCountByCountry[a] ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  } else {
    rest.sort((a, b) => a.localeCompare(b));
  }

  if (countries.includes("Other")) rest.push("Other");
  return rest;
}

export interface CountryOption {
  country: string;
  currency: string;
  offerCount: number;
  label: string;
}

/** Build sorted country picker options from active rate rows only. */
export function buildCountryOptions(
  rates: { country: string; currency: string; countryOfferCount?: number }[],
  currencyMeta?: {
    country: string;
    currency: string;
    offerCount: number;
    denomRanges: { min: number; max: number }[];
  }[]
): CountryOption[] {
  const byCountry = new Map<string, CountryOption>();

  for (const rate of rates) {
    const offerCount = rate.countryOfferCount ?? 0;
    const existing = byCountry.get(rate.country);
    if (!existing || offerCount > existing.offerCount) {
      byCountry.set(rate.country, {
        country: rate.country,
        currency: rate.currency,
        offerCount,
        label: `${rate.country} (${rate.currency})`,
      });
    }
  }

  for (const meta of currencyMeta ?? []) {
    const existing = byCountry.get(meta.country);
    if (existing && meta.offerCount > existing.offerCount) {
      existing.offerCount = meta.offerCount;
    }
  }

  const options = [...byCountry.values()];
  options.sort((a, b) => {
    if (a.country === "Other") return 1;
    if (b.country === "Other") return -1;
    const diff = b.offerCount - a.offerCount;
    return diff !== 0 ? diff : a.label.localeCompare(b.label);
  });

  return options;
}

/** Collapse multiple denomination bands into one min–max range for a country/currency. */
export function collapseDenomRangesToSingle(tiers: RateDenomRange[]): RateDenomRange[] {
  if (!tiers.length) return [];

  let minDenom: number | null = null;
  let maxDenom: number | null = null;
  let currency: string | undefined;

  for (const tier of tiers) {
    if (tier.minDenom != null) {
      minDenom = minDenom == null ? tier.minDenom : Math.min(minDenom, tier.minDenom);
    }
    if (tier.maxDenom != null) {
      maxDenom = maxDenom == null ? tier.maxDenom : Math.max(maxDenom, tier.maxDenom);
    }
    currency ??= tier.currency;
  }

  if (minDenom == null && maxDenom == null) return [];
  return [{ minDenom, maxDenom, currency }];
}

/** Collect denomination bounds from stored NoOnes currency metadata (one range per country). */
export function collectDenomRangesFromCurrencyMeta(
  currencyMeta: { country: string; currency: string; denomRanges: { min: number; max: number }[] }[],
  country: string,
  currency?: string
): RateDenomRange[] {
  const row = currencyMeta.find(
    (m) => m.country === country && (!currency || m.currency === currency)
  );
  if (!row?.denomRanges?.length) return [];
  return collapseDenomRangesToSingle(
    row.denomRanges.map((r) => ({
      minDenom: r.min,
      maxDenom: r.max,
      currency: row.currency,
    }))
  );
}

/** Collect denomination bounds for one country/currency from stored rate rows (one range). */
export function collectDenomRangesForCurrency(
  rates: { country: string; currency: string; minDenom: number | null; maxDenom: number | null }[],
  country: string,
  currency?: string
): RateDenomRange[] {
  const tiers: RateDenomRange[] = [];
  for (const rate of rates) {
    if (rate.country !== country) continue;
    if (currency && rate.currency !== currency) continue;
    if (rate.minDenom == null && rate.maxDenom == null) continue;
    tiers.push({
      minDenom: rate.minDenom,
      maxDenom: rate.maxDenom,
      currency: rate.currency,
    });
  }
  return collapseDenomRangesToSingle(tiers);
}

/** Collapse bounds from specific rate rows (e.g. already filtered by country + medium). */
export function collectDenomRangesFromRateRows(
  rates: { minDenom: number | null; maxDenom: number | null; currency?: string }[]
): RateDenomRange[] {
  const tiers: RateDenomRange[] = [];
  for (const rate of rates) {
    if (rate.minDenom == null && rate.maxDenom == null) continue;
    tiers.push({
      minDenom: rate.minDenom,
      maxDenom: rate.maxDenom,
      currency: rate.currency,
    });
  }
  if (tiers.length) return collapseDenomRangesToSingle(tiers);
  if (rates.length) return [{ minDenom: 1, maxDenom: null, currency: rates[0].currency }];
  return [];
}

/** Format distinct denomination tiers for display (e.g. "25–100, 101–500 USD"). */
export function formatDenomRanges(tiers: RateDenomRange[]): string {
  const valid = tiers.filter((tier) => tier.minDenom != null || tier.maxDenom != null);
  if (!valid.length) return "";

  const uniq = new Map<string, RateDenomRange>();
  for (const tier of valid) {
    const key = `${tier.minDenom ?? ""}|${tier.maxDenom ?? ""}`;
    uniq.set(key, tier);
  }

  const parts = [...uniq.values()]
    .sort((a, b) => (a.minDenom ?? 0) - (b.minDenom ?? 0) || (a.maxDenom ?? 0) - (b.maxDenom ?? 0))
    .map((tier) => `${tier.minDenom ?? "any"}–${tier.maxDenom ?? "any"}`);

  const currency = valid.find((t) => t.currency)?.currency;
  return currency ? `${parts.join(", ")} ${currency}` : parts.join(", ");
}

/** Default card amount: 100 when in range, else the tier minimum when it exceeds 100. */
export function defaultAmountForTiers(tiers: RateDenomRange[]): number {
  if (!tiers.length) return 100;

  const sorted = [...tiers].sort((a, b) => (a.minDenom ?? 0) - (b.minDenom ?? 0));
  const lowestMin = sorted.reduce<number | null>((min, tier) => {
    if (tier.minDenom == null) return min;
    return min == null ? tier.minDenom : Math.min(min, tier.minDenom);
  }, null);

  if (lowestMin != null && lowestMin > 100) return lowestMin;

  if (findRateTierForAmount(tiers, 100)) return 100;

  // 100 is below the minimum tier — use the smallest valid amount (usually the tier minimum).
  return lowestMin ?? sorted[0].minDenom ?? sorted[0].maxDenom ?? 100;
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

/** True when a tier has concrete min/max bounds (not open-ended). */
export function isBoundedDenomTier(tier: RateDenomRange): boolean {
  return tier.minDenom != null && tier.maxDenom != null;
}

/** Match a quotable rate row whose tier accepts the amount within country bounds. */
export function findBoundedRateForAmount<
  T extends RateDenomRange & { minDenom: number | null; maxDenom: number | null },
>(rates: T[], denomTiers: RateDenomRange[], amount: number): T | null {
  if (!rates.length) return null;
  const matching = rates.filter((r) => cardAmountInRateRange(amount, r));
  if (matching.length) {
    return matching.sort(
      (a, b) =>
        (a.maxDenom ?? Number.MAX_SAFE_INTEGER) -
        (a.minDenom ?? 0) -
        ((b.maxDenom ?? Number.MAX_SAFE_INTEGER) - (b.minDenom ?? 0))
    )[0];
  }
  if (!findRateTierForAmount(denomTiers, amount)) return null;
  return rates.find((r) => r.minDenom == null && r.maxDenom == null) ?? null;
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
  | "PAID"
  | "CANCELLED";

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
  usdtReductionPercent: number; // default 30
  ghsReductionPercent: number; // default 30 (Cedi)
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
