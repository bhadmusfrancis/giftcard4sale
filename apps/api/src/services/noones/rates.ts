import { env } from "../../env";
import { getRateConfig } from "../rateConfig";
import { noonesPost } from "./client";
import { resolvePaymentMethodSlug } from "./paymentMethods";
import { NoOnesOffer, NoOnesOfferAllData } from "./types";

export interface MarketRateResult {
  paymentMethod: string;
  currency: string;
  cryptoCurrency: string;
  offerHash: string;
  fiatPricePerCrypto: number;
  /** Estimated NGN per 1 unit of card face currency. */
  nairaPerUnit: number;
  margin?: number;
}

/** How much USDT (or BTC) you receive per 1 unit of card face currency. */
export function cryptoPerCardUnit(fiatPricePerCrypto: number): number {
  if (!fiatPricePerCrypto || fiatPricePerCrypto <= 0) return 0;
  return 1 / fiatPricePerCrypto;
}

/** Convert a NoOnes offer into nairaPerUnit for our rate engine. */
export async function offerToNairaPerUnit(
  offer: NoOnesOffer,
  cardCurrency: string
): Promise<number | null> {
  const price = Number(offer.fiat_price_per_crypto);
  if (!price || price <= 0) return null;

  const fiat = (offer.fiat_currency_code || offer.currency_code || cardCurrency).toUpperCase();
  const crypto = (offer.crypto_currency_code || env.noones.cryptoCurrency).toUpperCase();
  const config = await getRateConfig();

  const cryptoPerUnit = cryptoPerCardUnit(price);
  if (cryptoPerUnit <= 0) return null;

  if (fiat === "NGN") {
    // Direct NGN market: price is NGN per 1 crypto unit.
    return cryptoPerUnit * price;
  }

  // Card priced in USD/EUR/etc — convert crypto proceeds to NGN via our FX config.
  if (crypto === "USDT" || crypto === "USDC") {
    return cryptoPerUnit * config.rates.ngnPerUsdt;
  }

  // BTC and others: approximate via USDT (admin should keep ngnPerUsdt aligned).
  return cryptoPerUnit * config.rates.ngnPerUsdt;
}

/** Tags NoOnes may use for digital / e-code gift card offers. */
const ECODE_OFFER_TAGS = ["e-gift-card", "egift-card", "digital-code", "e-code"];

export async function fetchBestOffer(params: {
  paymentMethod: string;
  cardCurrency: string;
  cardAmount: number;
  cryptoCurrency?: string;
  offerTags?: string;
}): Promise<MarketRateResult | null> {
  const crypto = params.cryptoCurrency || env.noones.cryptoCurrency;

  const query: Record<string, string | number> = {
    offer_type: "buy",
    group: "gift-cards",
    payment_method: params.paymentMethod,
    currency_code: params.cardCurrency,
    crypto_currency_code: crypto,
    fiat_amount_min: Math.floor(params.cardAmount),
    fiat_amount_max: Math.ceil(params.cardAmount),
    limit: 50,
  };
  if (params.offerTags) query.offer_tags = params.offerTags;

  const data = await noonesPost<NoOnesOfferAllData>("offer/all", query);

  const offers = (data.offers || []).filter((o) => o.active !== false);
  if (!offers.length) return null;

  let best: NoOnesOffer | null = null;
  let bestNaira = 0;

  for (const offer of offers) {
    const naira = await offerToNairaPerUnit(offer, params.cardCurrency);
    if (naira && naira > bestNaira) {
      bestNaira = naira;
      best = offer;
    }
  }

  if (!best) return null;

  const hash = best.offer_id || best.offer_hash;
  if (!hash) return null;

  return {
    paymentMethod: params.paymentMethod,
    currency: params.cardCurrency,
    cryptoCurrency: crypto,
    offerHash: hash,
    fiatPricePerCrypto: Number(best.fiat_price_per_crypto),
    nairaPerUnit: bestNaira,
    margin: best.margin,
  };
}

/** Fetch marketplace rate for PHYSICAL or ECODE (tries tagged e-code offers first). */
export async function fetchBestOfferForMedium(params: {
  paymentMethod: string;
  cardCurrency: string;
  cardAmount: number;
  medium: "PHYSICAL" | "ECODE";
  cryptoCurrency?: string;
}): Promise<MarketRateResult | null> {
  if (params.medium === "PHYSICAL") {
    return fetchBestOffer(params);
  }

  for (const tag of ECODE_OFFER_TAGS) {
    const tagged = await fetchBestOffer({ ...params, offerTags: tag });
    if (tagged) return tagged;
  }

  const physical = await fetchBestOffer(params);
  if (!physical) return null;

  return {
    ...physical,
    nairaPerUnit: physical.nairaPerUnit * env.noones.ecodeRateFactor,
  };
}

export async function resolveOfferForCard(params: {
  cardSlug: string;
  cardName: string;
  paymentMethodOverride?: string | null;
  cardCurrency: string;
  cardAmount: number;
}): Promise<MarketRateResult | null> {
  const paymentMethod = resolvePaymentMethodSlug(
    params.cardSlug,
    params.cardName,
    params.paymentMethodOverride
  );
  if (!paymentMethod) return null;

  return fetchBestOffer({
    paymentMethod,
    cardCurrency: params.cardCurrency,
    cardAmount: params.cardAmount,
  });
}
