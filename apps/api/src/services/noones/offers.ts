import { env } from "../../env";
import { noonesPost } from "./client";
import { NoOnesOfferAllData } from "./types";

const OFFER_LIST_QUERY = {
  offer_type: "buy" as const,
  group: "gift-cards",
  crypto_currency_code: env.noones.cryptoCurrency,
};

/** Count active NoOnes buy offers for a gift-card payment method. */
export async function countNoOnesOffers(paymentMethod: string): Promise<number> {
  const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
    ...OFFER_LIST_QUERY,
    payment_method: paymentMethod,
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
