import { CardMedium } from "@prisma/client";
import { env } from "../../env";
import { noonesPost } from "./client";
import {
  CurrencyOfferMeta,
  extractDenomRangesFromOffers,
} from "./offers";
import { offerTagSlugs } from "./receiptPolicy";
import { loadScoredOffersForMedium } from "./rates";
import { NoOnesOffer, NoOnesOfferAllData } from "./types";

const GENERIC_EURO_TAG_SLUGS = new Set([
  "europe",
  "european-union",
  "eu",
  "euro-zone",
  "eurozone",
  "pan-europe",
  "euro-region",
]);

const EURO_MEMBER_COUNTRY_NAMES = new Set([
  "germany",
  "france",
  "italy",
  "spain",
  "netherlands",
  "austria",
  "belgium",
  "ireland",
  "portugal",
  "finland",
  "greece",
  "luxembourg",
  "slovenia",
  "slovakia",
  "estonia",
  "latvia",
  "lithuania",
  "cyprus",
  "malta",
  "croatia",
]);

const GENERIC_EURO_TEXT =
  /\b(europe|european union|euro\s*zone|eurozone|pan.?europe|eu\s+region)\b/i;

const COUNTRY_ONLY_TEXT =
  /\b(germany|france|italy|spain|netherlands|austria|belgium|ireland|portugal|finland|greece)\s+only\b/i;

const OFFER_LIST_QUERY = {
  offer_type: "buy" as const,
  group: "gift-cards",
  crypto_currency_code: env.noones.cryptoCurrency,
};

function offerFiatCode(offer: NoOnesOffer): string {
  return (offer.fiat_currency_code || offer.currency_code || "").toUpperCase();
}

/** True when a NoOnes EUR offer is pan-European, not locked to one EU country. */
export function offerIsGenericEuro(offer: NoOnesOffer): boolean {
  if (offerFiatCode(offer) !== "EUR") return false;

  const slugs = offerTagSlugs(offer.tags);
  if (slugs.some((s) => GENERIC_EURO_TAG_SLUGS.has(s))) return true;

  const text = [offer.description, offer.offer_terms, offer.payment_method_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) return true;

  if (COUNTRY_ONLY_TEXT.test(text)) return false;
  if (/^(germany|france|italy|spain|netherlands|austria|belgium|ireland)(\s+only)?$/i.test(text.trim())) {
    return false;
  }

  if (GENERIC_EURO_TEXT.test(text)) return true;

  const mentionsMember = [...EURO_MEMBER_COUNTRY_NAMES].some((name) =>
    new RegExp(`\\b${name}\\b`, "i").test(text)
  );
  return !mentionsMember;
}

export function filterGenericEuroOffers(offers: NoOnesOffer[]): NoOnesOffer[] {
  return offers.filter(offerIsGenericEuro);
}

function offerKey(offer: NoOnesOffer): string | null {
  return offer.offer_id || offer.offer_hash || null;
}

/** Offer count + denomination ranges for generic EUR offers only. */
export async function fetchGenericEuroOfferMeta(
  paymentMethod: string
): Promise<CurrencyOfferMeta> {
  const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
    ...OFFER_LIST_QUERY,
    payment_method: paymentMethod,
    currency_code: "EUR",
    limit: 50,
  });

  const offers = filterGenericEuroOffers((data.offers || []).filter((o) => o.active !== false));
  return {
    offerCount: offers.length,
    ranges: extractDenomRangesFromOffers(offers),
  };
}

/** Count distinct live generic EUR offers. */
export async function countGenericEuroOffers(
  paymentMethod: string,
  options?: { medium?: CardMedium }
): Promise<number> {
  const mediums: CardMedium[] = options?.medium ? [options.medium] : ["PHYSICAL", "ECODE"];
  const seen = new Set<string>();
  let total = 0;

  for (const medium of mediums) {
    const scored = await loadScoredOffersForMedium({
      paymentMethod,
      cardCurrency: "EUR",
      cardAmount: 100,
      medium,
    });
    for (const offer of filterGenericEuroOffers(scored.map((s) => s.offer))) {
      const key = offerKey(offer);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      total++;
    }
  }

  return total;
}

/** Quick check for pan-European EUR offers on a payment method. */
export async function hasGenericEuroOffers(paymentMethod: string): Promise<boolean> {
  try {
    const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
      ...OFFER_LIST_QUERY,
      payment_method: paymentMethod,
      currency_code: "EUR",
      offer_tags: "europe",
      limit: 1,
    });
    const tagged = data.totalCount ?? data.count ?? (data.offers?.length ?? 0);
    if (tagged > 0) return true;
  } catch {
    /* fall through */
  }

  const meta = await fetchGenericEuroOfferMeta(paymentMethod);
  return meta.offerCount > 0;
}
