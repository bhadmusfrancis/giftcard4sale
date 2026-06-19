import { CardMedium } from "@prisma/client";
import { env } from "../../env";
import { noonesPost } from "./client";
import { offerTagSlugs } from "./receiptPolicy";
import { loadScoredOffersForMedium } from "./rates";
import { NoOnesOffer, NoOnesOfferAllData } from "./types";

const OTHER_COUNTRY_TAG_SLUGS = new Set([
  "other-countries",
  "other-countries-accepted",
  "other-country",
  "other-country-accepted",
  "any-country",
  "any-countries",
  "worldwide",
  "international",
  "international-only",
  "global",
  "all-countries",
  "non-us",
  "non-usa",
  "non-us-only",
]);

const KNOWN_COUNTRY_NAMES = new Set([
  "us",
  "usa",
  "united states",
  "uk",
  "united kingdom",
  "germany",
  "canada",
  "australia",
  "u.s.",
  "u.s",
  "u.k.",
]);

const OTHER_COUNTRY_TEXT =
  /\b(other\s+countr|any\s+countr|all\s+countr|worldwide|international|any\s+region|non[-\s]?us|except\s+us)\b/i;

const OFFER_LIST_QUERY = {
  offer_type: "buy" as const,
  group: "gift-cards",
  crypto_currency_code: env.noones.cryptoCurrency,
};

/** True when a NoOnes offer explicitly accepts countries beyond the standard tier list. */
export function offerAcceptsOtherCountries(offer: NoOnesOffer): boolean {
  const slugs = offerTagSlugs(offer.tags);
  if (slugs.some((s) => OTHER_COUNTRY_TAG_SLUGS.has(s))) return true;

  const text = [offer.description, offer.offer_terms, offer.payment_method_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) return false;
  if (!OTHER_COUNTRY_TEXT.test(text)) return false;

  const mentionsKnownOnly =
    KNOWN_COUNTRY_NAMES.has(text.trim()) ||
    (/^(us|uk|usa|canada|australia|germany)(\s+only)?$/i.test(text.trim()) &&
      !OTHER_COUNTRY_TEXT.test(text));

  return !mentionsKnownOnly;
}

export function filterOtherCountryOffers(offers: NoOnesOffer[]): NoOnesOffer[] {
  return offers.filter(offerAcceptsOtherCountries);
}

function offerKey(offer: NoOnesOffer): string | null {
  return offer.offer_id || offer.offer_hash || null;
}

/** Count distinct live NoOnes offers that accept non-standard countries. */
export async function countOtherCountryOffers(
  paymentMethod: string,
  options?: { medium?: CardMedium }
): Promise<number> {
  const mediums: CardMedium[] = options?.medium ? [options.medium] : ["PHYSICAL", "ECODE"];
  const seen = new Set<string>();
  let total = 0;

  for (const medium of mediums) {
    const scored = await loadScoredOffersForMedium({
      paymentMethod,
      cardCurrency: "USD",
      cardAmount: 100,
      medium,
    });
    for (const offer of filterOtherCountryOffers(scored.map((s) => s.offer))) {
      const key = offerKey(offer);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      total++;
    }
  }

  return total;
}

/** Quick check whether any live NoOnes offers accept countries beyond standard tiers. */
export async function hasOtherCountryOffers(paymentMethod: string): Promise<boolean> {
  try {
    const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
      ...OFFER_LIST_QUERY,
      payment_method: paymentMethod,
      currency_code: "USD",
      offer_tags: "other-countries",
      limit: 1,
    });
    const tagged = data.totalCount ?? data.count ?? (data.offers?.length ?? 0);
    if (tagged > 0) return true;
  } catch {
    /* fall through to heuristic filter */
  }

  return (await countOtherCountryOffers(paymentMethod)) > 0;
}
