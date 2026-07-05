import { env } from "../../env";

import { ReceiptType } from "@gc4s/shared";

import { getRateConfig } from "../rateConfig";

import { noonesPost } from "./client";

import { resolvePaymentMethodSlug } from "./paymentMethods";

import { resolveRequiresReceipt, paymentMethodUsuallyRequiresReceipt, offerMatchesReceiptType } from "./receiptPolicy";

import { NoOnesOffer, NoOnesOfferAllData, NoOnesOfferTag } from "./types";



/** Default top offers (by completed trades) averaged into a displayed rate. */

export const DEFAULT_TOP_OFFERS_FOR_RATE = 3;



/** Whether a single NoOnes offer is tagged receipt-required (ignores card category). */

export function offerHasReceiptTag(tags: NoOnesOfferTag[] | undefined): boolean {

  if (!tags?.length) return false;

  const slugs = tags.map((t) => t.slug);

  if (slugs.includes("no-receipt-needed")) return false;

  return slugs.includes("receipt-required");

}



/** @deprecated Use resolveRequiresReceipt(paymentMethod, tags) for user-facing policy. */

export function offerRequiresReceipt(tags: NoOnesOfferTag[] | undefined): boolean {

  return offerHasReceiptTag(tags);

}



export interface MarketRateResult {

  paymentMethod: string;

  currency: string;

  cryptoCurrency: string;

  offerHash: string;

  fiatPricePerCrypto: number;

  /** Estimated NGN per 1 unit of card face currency. */

  nairaPerUnit: number;

  margin?: number;

  tradeVolume?: number;

  /** True when the best offer is tagged receipt-required on NoOnes. */

  requiresReceipt: boolean;

}



/** Completed trades on this offer (NoOnes `total_successful_trades`). */

export function offerTradeVolume(offer: NoOnesOffer): number {

  const trades = Number(offer.total_successful_trades);

  return Number.isFinite(trades) && trades > 0 ? trades : 0;

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



type ScoredOffer = { offer: NoOnesOffer; nairaPerUnit: number; tradeVolume: number };



function sortOffersByVolume(offers: ScoredOffer[]): ScoredOffer[] {

  return [...offers].sort((a, b) => b.tradeVolume - a.tradeVolume || b.nairaPerUnit - a.nairaPerUnit);

}



/** Average nairaPerUnit from the top N offers by completed trades. */

export function averageTopOffersNaira(

  offers: ScoredOffer[],

  topN = DEFAULT_TOP_OFFERS_FOR_RATE

): number | null {

  if (!offers.length) return null;

  const top = sortOffersByVolume(offers).slice(0, topN);

  const sum = top.reduce((total, o) => total + o.nairaPerUnit, 0);

  return sum / top.length;

}

/** Highest-volume offer whose rate meets the averaged gate floor (for trade/start). */
export function pickVolumeOfferAtOrAboveAvg(
  offers: ScoredOffer[],
  avgNaira: number
): ScoredOffer | null {
  return sortOffersByVolume(offers).find((o) => o.nairaPerUnit >= avgNaira) ?? null;
}



function sortOffersForTrade(

  offers: ScoredOffer[],

  paymentMethod: string,

  preferNoReceipt?: boolean

): ScoredOffer[] {

  const receiptProne = paymentMethodUsuallyRequiresReceipt(paymentMethod);

  return [...offers].sort((a, b) => {

    const aReceipt = offerHasReceiptTag(a.offer.tags);

    const bReceipt = offerHasReceiptTag(b.offer.tags);



    if (receiptProne && preferNoReceipt) {

      if (aReceipt !== bReceipt) return aReceipt ? 1 : -1;

    }



    return b.tradeVolume - a.tradeVolume || b.nairaPerUnit - a.nairaPerUnit;

  });

}



function poolForAverage(

  offers: ScoredOffer[],

  paymentMethod: string,

  preferNoReceipt?: boolean

): ScoredOffer[] {

  if (!preferNoReceipt) return offers;



  const receiptProne = paymentMethodUsuallyRequiresReceipt(paymentMethod);

  if (!receiptProne) return offers;



  const noReceipt = offers.filter((o) => !offerHasReceiptTag(o.offer.tags));

  return noReceipt.length ? noReceipt : offers;

}



function toMarketRateResult(

  best: ScoredOffer,

  params: {

    paymentMethod: string;

    cardCurrency: string;

    crypto: string;

    nairaPerUnit: number;

  }

): MarketRateResult {

  const hash = best.offer.offer_id || best.offer.offer_hash;

  if (!hash) throw new Error("NoOnes offer missing id/hash");



  return {

    paymentMethod: params.paymentMethod,

    currency: params.cardCurrency,

    cryptoCurrency: params.crypto,

    offerHash: hash,

    fiatPricePerCrypto: Number(best.offer.fiat_price_per_crypto),

    nairaPerUnit: params.nairaPerUnit,

    margin: best.offer.margin,

    tradeVolume: best.tradeVolume,

    requiresReceipt: resolveRequiresReceipt(params.paymentMethod, best.offer.tags),

  };

}



async function loadScoredOffers(

  query: Record<string, string | number>,

  cardCurrency: string

): Promise<ScoredOffer[]> {

  const data = await noonesPost<NoOnesOfferAllData>("offer/all", query);

  const offers = (data.offers || []).filter((o) => o.active !== false);

  const scored: ScoredOffer[] = [];



  for (const offer of offers) {

    const naira = await offerToNairaPerUnit(offer, cardCurrency);

    if (!naira || naira <= 0) continue;

    scored.push({ offer, nairaPerUnit: naira, tradeVolume: offerTradeVolume(offer) });

  }



  return scored;

}



async function loadOffersForParams(params: {

  paymentMethod: string;

  cardCurrency: string;

  cardAmount: number;

  cryptoCurrency?: string;

  offerTags?: string;

}): Promise<ScoredOffer[]> {

  const crypto = params.cryptoCurrency || env.noones.cryptoCurrency;



  const baseQuery: Record<string, string | number> = {

    offer_type: "buy",

    group: "gift-cards",

    payment_method: params.paymentMethod,

    currency_code: params.cardCurrency,

    crypto_currency_code: crypto,

    limit: 50,

  };

  if (params.offerTags) baseQuery.offer_tags = params.offerTags;



  let offers = await loadScoredOffers(

    {

      ...baseQuery,

      fiat_amount_min: Math.floor(params.cardAmount),

      fiat_amount_max: Math.ceil(params.cardAmount),

    },

    params.cardCurrency

  );



  if (!offers.length) {

    offers = await loadScoredOffers(baseQuery, params.cardCurrency);

  }



  return offers;

}



/** Load scored NoOnes offers for a card medium (single API pass per tier). */
export async function loadScoredOffersForMedium(params: {
  paymentMethod: string;
  cardCurrency: string;
  cardAmount: number;
  medium: "PHYSICAL" | "ECODE";
  cryptoCurrency?: string;
}): Promise<ScoredOffer[]> {
  if (params.medium === "PHYSICAL") {
    return loadOffersForParams(params);
  }

  for (const tag of ECODE_OFFER_TAGS) {
    const tagged = await loadOffersForParams({ ...params, offerTags: tag });
    if (tagged.length) return tagged;
  }

  return loadOffersForParams(params);
}



function poolForReceiptType(offers: ScoredOffer[], receiptType: ReceiptType): ScoredOffer[] {
  return offers.filter((o) => offerMatchesReceiptType(o.offer, receiptType));
}



/** Pick the single best offer for trade execution (not averaged pricing). */

export async function fetchBestOffer(params: {

  paymentMethod: string;

  cardCurrency: string;

  cardAmount: number;

  cryptoCurrency?: string;

  offerTags?: string;

  preferNoReceipt?: boolean;

  receiptType?: ReceiptType;

}): Promise<MarketRateResult | null> {

  const crypto = params.cryptoCurrency || env.noones.cryptoCurrency;

  const offers = await loadOffersForParams(params);

  if (!offers.length) return null;



  const receiptType =
    params.receiptType ?? (params.preferNoReceipt ? "NONE" : params.paymentMethod ? "DEBIT" : "NONE");

  const pool = poolForReceiptType(offers, receiptType);

  const sorted = sortOffersByVolume(pool.length ? pool : offers);

  const best = sorted[0];

  const hash = best.offer.offer_id || best.offer.offer_hash;

  if (!hash) return null;



  return toMarketRateResult(best, {

    paymentMethod: params.paymentMethod,

    cardCurrency: params.cardCurrency,

    crypto,

    nairaPerUnit: best.nairaPerUnit,

  });

}



/** Average rate from the top offers by completed trades (used for stored pricing). */

export async function fetchAverageOffer(params: {

  paymentMethod: string;

  cardCurrency: string;

  cardAmount: number;

  cryptoCurrency?: string;

  offerTags?: string;

  preferNoReceipt?: boolean;

  receiptType?: ReceiptType;

}): Promise<MarketRateResult | null> {

  const crypto = params.cryptoCurrency || env.noones.cryptoCurrency;

  const offers = await loadOffersForParams(params);

  if (!offers.length) return null;



  const receiptType =
    params.receiptType ?? (params.preferNoReceipt ? "NONE" : "DEBIT");

  const pool = poolForReceiptType(offers, receiptType);

  const scoredPool = pool.length ? pool : offers;

  const { noonesTopOffersForRate } = await getRateConfig();

  const avgNaira = averageTopOffersNaira(scoredPool, noonesTopOffersForRate);

  if (!avgNaira || avgNaira <= 0) return null;

  const best = pickVolumeOfferAtOrAboveAvg(scoredPool, avgNaira);

  if (!best) return null;

  const hash = best.offer.offer_id || best.offer.offer_hash;

  if (!hash) return null;



  return toMarketRateResult(best, {

    paymentMethod: params.paymentMethod,

    cardCurrency: params.cardCurrency,

    crypto,

    nairaPerUnit: avgNaira,

  });

}



/** Fetch marketplace rate for PHYSICAL or ECODE (tries tagged e-code offers first). */

export async function fetchBestOfferForMedium(params: {

  paymentMethod: string;

  cardCurrency: string;

  cardAmount: number;

  medium: "PHYSICAL" | "ECODE";

  cryptoCurrency?: string;

  preferNoReceipt?: boolean;

  receiptType?: ReceiptType;

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



/** Averaged marketplace rate for PHYSICAL or ECODE tiers (stored pricing). */

export async function fetchAverageOfferForMedium(params: {

  paymentMethod: string;

  cardCurrency: string;

  cardAmount: number;

  medium: "PHYSICAL" | "ECODE";

  cryptoCurrency?: string;

  preferNoReceipt?: boolean;

  receiptType?: ReceiptType;

}): Promise<MarketRateResult | null> {

  if (params.medium === "PHYSICAL") {

    return fetchAverageOffer(params);

  }



  for (const tag of ECODE_OFFER_TAGS) {

    const tagged = await fetchAverageOffer({ ...params, offerTags: tag });

    if (tagged) return tagged;

  }



  const physical = await fetchAverageOffer(params);

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
  medium?: "PHYSICAL" | "ECODE";
  preferNoReceipt?: boolean;
  receiptType?: ReceiptType;
  /** Minimum raw nairaPerUnit (pre-deduction) the offer must meet — grossed up from user quote. */
  minNairaPerUnit?: number;
}): Promise<MarketRateResult | null> {
  const paymentMethod = resolvePaymentMethodSlug(
    params.cardSlug,
    params.cardName,
    params.paymentMethodOverride
  );
  if (!paymentMethod) return null;

  const offerParams = {
    paymentMethod,
    cardCurrency: params.cardCurrency,
    cardAmount: params.cardAmount,
    preferNoReceipt: params.preferNoReceipt,
    receiptType: params.receiptType,
  };

  const medium = params.medium === "ECODE" ? "ECODE" : "PHYSICAL";
  const result = await fetchAverageOfferForMedium({ ...offerParams, medium });

  if (!result) return null;

  if (params.minNairaPerUnit && result.nairaPerUnit < params.minNairaPerUnit * 0.98) {
    return null;
  }

  return result;
}


