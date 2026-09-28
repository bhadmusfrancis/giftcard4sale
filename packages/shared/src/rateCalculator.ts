import { RateQuote, RateQuoteInput, RateReductions } from "./types";

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Per-card deduction overrides; a null/undefined field falls back to the platform default. */
export interface CardReductionOverrides {
  nairaReductionPercent?: number | null;
  usdtReductionPercent?: number | null;
  ghsReductionPercent?: number | null;
}

/** Effective deductions for a card: its own overrides where set, else the platform defaults. */
export function reductionsForCard(
  card: CardReductionOverrides | null | undefined,
  base: RateReductions
): RateReductions {
  if (!card) return base;
  return {
    nairaReductionPercent: card.nairaReductionPercent ?? base.nairaReductionPercent,
    usdtReductionPercent: card.usdtReductionPercent ?? base.usdtReductionPercent,
    ghsReductionPercent: card.ghsReductionPercent ?? base.ghsReductionPercent,
  };
}

/**
 * Apple/iTunes family card types (App Store & iTunes, Apple gift cards).
 * Matches by slug or display name so catalog aliases (apple-itunes, itunes,
 * apple-us-only, …) all count.
 */
export function isAppleItunesCard(
  card: { slug?: string | null; name?: string | null } | null | undefined
): boolean {
  if (!card) return false;
  return /apple|itunes/i.test(`${card.slug ?? ""} ${card.name ?? ""}`);
}

/** True for an Apple/iTunes rate tier priced in euros (the "Euro" country tier). */
export function isEuroAppleRate(
  card: { slug?: string | null; name?: string | null } | null | undefined,
  currency?: string | null,
  country?: string | null
): boolean {
  return (
    isAppleItunesCard(card) &&
    (currency?.toUpperCase() === "EUR" || country === "Euro")
  );
}

/**
 * Euro Apple/iTunes denominations are traded in multiples of 5 or 50. Any other
 * amount attracts the configured odd-denomination reduction.
 */
export function euroDenominationIsOdd(amount: number): boolean {
  return amount % 5 !== 0 && amount % 50 !== 0;
}

/**
 * When a seller must type their actual card country: the catch-all "Other"
 * tier, or a Euro Apple/iTunes tier (each euro card belongs to one EU country).
 */
export function needsCardCountryInput(
  country: string | null | undefined,
  opts?: { card?: { slug?: string | null; name?: string | null } | null; currency?: string | null }
): boolean {
  if (country === "Other") return true;
  return isEuroAppleRate(opts?.card, opts?.currency, country);
}

/**
 * Computes what a user is paid for a gift card.
 *
 * Business rules (from the spec):
 *  - The parsed rate (`nairaPerUnit`) is the SLOW rate, in NGN per 1 unit of the
 *    card's face currency.
 *  - Naira payout:  reduce the rate by NAIRA_REDUCTION_PERCENT (default 20%).
 *  - USDT payout: reduce by USDT_REDUCTION_PERCENT (default 30%), then convert NGN -> USDT.
 *  - Cedi payout: reduce by GHS_REDUCTION_PERCENT (default 30%), then convert NGN -> GHS.
 */
export function calculateRateQuote(input: RateQuoteInput): RateQuote {
  const { nairaPerUnit, cardAmount, payoutCurrency, rates, reductions } = input;

  const grossNaira = nairaPerUnit * cardAmount;
  const extraReductionPercent = input.extraReductionPercent ?? 0;
  const extraFactor = 1 - Math.min(Math.max(extraReductionPercent, 0), 100) / 100;

  if (payoutCurrency === "NGN") {
    const reductionPercent = reductions.nairaReductionPercent;
    const effectiveNairaPerUnit = nairaPerUnit * (1 - reductionPercent / 100) * extraFactor;
    return {
      payoutCurrency,
      effectiveNairaPerUnit: round(effectiveNairaPerUnit, 4),
      grossNaira: round(grossNaira),
      payoutAmount: round(effectiveNairaPerUnit * cardAmount),
      reductionPercent,
      extraReductionPercent,
    };
  }

  // USDT or GHS: reduce by currency-specific percent, then convert from naira.
  const reductionPercent =
    payoutCurrency === "USDT" ? reductions.usdtReductionPercent : reductions.ghsReductionPercent;
  const effectiveNairaPerUnit = nairaPerUnit * (1 - reductionPercent / 100) * extraFactor;
  const reducedNaira = effectiveNairaPerUnit * cardAmount;

  let payoutAmount: number;
  if (payoutCurrency === "USDT") {
    payoutAmount = reducedNaira / rates.ngnPerUsdt;
  } else {
    // GHS (Cedi)
    payoutAmount = reducedNaira / rates.ngnPerGhs;
  }

  return {
    payoutCurrency,
    effectiveNairaPerUnit: round(effectiveNairaPerUnit, 4),
    grossNaira: round(grossNaira),
    payoutAmount: round(payoutAmount, payoutCurrency === "USDT" ? 4 : 2),
    reductionPercent,
    extraReductionPercent,
  };
}
