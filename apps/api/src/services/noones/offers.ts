import { env } from "../../env";
import { noonesPost } from "./client";
import { NoOnesOffer, NoOnesOfferAllData } from "./types";

const OFFER_LIST_QUERY = {
  offer_type: "buy" as const,
  group: "gift-cards",
  crypto_currency_code: env.noones.cryptoCurrency,
};

function offerTradeVolume(offer: NoOnesOffer): number {
  const trades = Number(offer.total_successful_trades);
  return Number.isFinite(trades) && trades > 0 ? trades : 0;
}

export interface OfferDenomRange {
  min: number;
  max: number;
}

export interface CurrencyOfferMeta {
  offerCount: number;
  ranges: OfferDenomRange[];
}

function readOfferAmount(...values: unknown[]): number {
  for (const value of values) {
    if (value == null || value === "") continue;
    const n =
      typeof value === "string" ? Number(value.replace(/,/g, "").trim()) : Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
}

/** Distinct fiat amount ranges advertised on live NoOnes offers. */
export function extractDenomRangesFromOffers(offers: NoOnesOffer[]): OfferDenomRange[] {
  const map = new Map<string, OfferDenomRange>();

  const add = (min: number, max: number) => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return;
    const key = `${Math.round(min)}|${Math.round(max)}`;
    map.set(key, { min: Math.round(min), max: Math.round(max) });
  };

  for (const offer of offers) {
    const raw = offer as NoOnesOffer & Record<string, unknown>;
    const min = readOfferAmount(
      raw.fiat_amount_range_min,
      raw.fiat_amount_min,
      raw.fiat_limit_min,
      raw.min_fiat_amount,
      raw.min_amount,
      raw.offer_min_amount
    );
    const max = readOfferAmount(
      raw.fiat_amount_range_max,
      raw.fiat_amount_max,
      raw.fiat_limit_max,
      raw.max_fiat_amount,
      raw.max_amount,
      raw.offer_max_amount
    );

    if (Number.isFinite(min) && Number.isFinite(max)) {
      add(min, max);
    } else if (Number.isFinite(min)) {
      add(min, min);
    } else if (Number.isFinite(max)) {
      add(max, max);
    }

    const text = [offer.description, offer.offer_terms, offer.payment_method_name]
      .filter(Boolean)
      .join(" ");
    const textRange = parseDenomRangeFromText(text);
    if (textRange) add(textRange.min, textRange.max);

    const predefined = raw.predefined_amounts;
    if (Array.isArray(predefined) && predefined.length >= 2) {
      const nums = predefined.map((v) => readOfferAmount(v)).filter((n) => Number.isFinite(n));
      if (nums.length >= 2) add(Math.min(...nums), Math.max(...nums));
    } else if (Array.isArray(predefined) && predefined.length === 1) {
      const n = readOfferAmount(predefined[0]);
      if (Number.isFinite(n)) add(n, n);
    }
  }

  return [...map.values()].sort((a, b) => a.min - b.min || a.max - b.max);
}

/** Parse denomination hints from offer description text, e.g. "(200-500 in 100s)". */
export function parseDenomRangeFromText(text: string): OfferDenomRange | null {
  if (!text) return null;

  const paren = text.match(/\(([^)]*\d[^)]*)\)/);
  const segment = paren?.[1] ?? text;
  const rangeMatch = segment.match(/(\d[\d,]*(?:\.\d+)?)\s*[-–—to]+\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1].replace(/,/g, ""));
    const max = Number(rangeMatch[2].replace(/,/g, ""));
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
      return { min: Math.round(min), max: Math.round(max) };
    }
  }

  const singles = (segment.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((s) => Number(s.replace(/,/g, "")));
  const inMatch = segment.match(/in\s+(\d+)/i);
  let values = singles.filter((n) => Number.isFinite(n) && n > 0);
  if (inMatch) {
    const step = Number(inMatch[1]);
    const idx = values.lastIndexOf(step);
    if (idx !== -1) values = values.filter((_, i) => i !== idx);
  }
  if (values.length >= 2) {
    return { min: Math.round(Math.min(...values)), max: Math.round(Math.max(...values)) };
  }

  return null;
}

/** Offer count + denomination ranges for one card currency. */
export async function fetchCurrencyOfferMeta(
  paymentMethod: string,
  currency: string
): Promise<CurrencyOfferMeta> {
  const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
    ...OFFER_LIST_QUERY,
    payment_method: paymentMethod,
    currency_code: currency.toUpperCase(),
    limit: 50,
  });

  const offers = (data.offers || []).filter((o) => o.active !== false);
  const offerCount = data.totalCount ?? data.count ?? offers.length;
  return { offerCount, ranges: extractDenomRangesFromOffers(offers) };
}

export interface NoOnesCardStats {
  offerCount: number;
  tradeVolume: number;
}

/** Count active NoOnes buy offers for a gift-card payment method. */
export async function countNoOnesOffers(paymentMethod: string): Promise<number> {
  const { offerCount } = await fetchNoOnesCardStats(paymentMethod);
  return offerCount;
}

/** Offer count + completed-trade volume for catalog sorting. */
export async function fetchNoOnesCardStats(
  paymentMethod: string,
  currency?: string
): Promise<NoOnesCardStats> {
  const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
    ...OFFER_LIST_QUERY,
    payment_method: paymentMethod,
    ...(currency ? { currency_code: currency.toUpperCase() } : {}),
    limit: 50,
  });

  const offers = (data.offers || []).filter((o) => o.active !== false);
  const offerCount = data.totalCount ?? data.count ?? offers.length;
  const tradeVolume = offers.reduce((sum, offer) => sum + offerTradeVolume(offer), 0);

  return { offerCount, tradeVolume };
}

/** NoOnes buy offers for one card currency (used for country-tier visibility). */
export async function countOffersForCurrency(
  paymentMethod: string,
  currency: string
): Promise<number> {
  const { offerCount } = await fetchCurrencyOfferMeta(paymentMethod, currency);
  return offerCount;
}

/** Fiat currencies present on live NoOnes offers (not limited to our default tiers). */
export async function discoverOfferCurrencies(paymentMethod: string): Promise<string[]> {
  const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
    ...OFFER_LIST_QUERY,
    payment_method: paymentMethod,
    limit: 50,
  });

  const currencies = new Set<string>();
  for (const offer of data.offers || []) {
    const code = (offer.fiat_currency_code || offer.currency_code || "").toUpperCase();
    if (code) currencies.add(code);
  }
  return [...currencies];
}
