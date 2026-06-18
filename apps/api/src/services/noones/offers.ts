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
  const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
    ...OFFER_LIST_QUERY,
    payment_method: paymentMethod,
    currency_code: currency.toUpperCase(),
    limit: 1,
  });

  return data.totalCount ?? data.count ?? data.offers?.length ?? 0;
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
