import { RateQuote, RateQuoteInput } from "./types";

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
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

  if (payoutCurrency === "NGN") {
    const reductionPercent = reductions.nairaReductionPercent;
    const effectiveNairaPerUnit = nairaPerUnit * (1 - reductionPercent / 100);
    return {
      payoutCurrency,
      effectiveNairaPerUnit: round(effectiveNairaPerUnit, 4),
      grossNaira: round(grossNaira),
      payoutAmount: round(effectiveNairaPerUnit * cardAmount),
      reductionPercent,
    };
  }

  // USDT or GHS: reduce by currency-specific percent, then convert from naira.
  const reductionPercent =
    payoutCurrency === "USDT" ? reductions.usdtReductionPercent : reductions.ghsReductionPercent;
  const effectiveNairaPerUnit = nairaPerUnit * (1 - reductionPercent / 100);
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
  };
}
