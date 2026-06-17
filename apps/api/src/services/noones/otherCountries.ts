import { NoOnesOffer } from "./types";
import { offerTagSlugs } from "./receiptPolicy";
import { loadScoredOffersForMedium } from "./rates";

const OTHER_COUNTRY_TAG_SLUGS = new Set([
  "other-countries",
  "other-countries-accepted",
  "any-country",
  "any-countries",
  "worldwide",
  "international",
  "global",
  "all-countries",
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
  /\b(other\s+countr|any\s+countr|all\s+countr|worldwide|international|any\s+region)\b/i;

/** True when a NoOnes offer explicitly accepts countries beyond the standard tier list. */
export function offerAcceptsOtherCountries(offer: NoOnesOffer): boolean {
  const slugs = offerTagSlugs(offer.tags);
  if (slugs.some((s) => OTHER_COUNTRY_TAG_SLUGS.has(s))) return true;

  const text = [offer.description, offer.offer_terms]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) return false;
  if (!OTHER_COUNTRY_TEXT.test(text)) return false;

  // Exclude offers that only mention the standard countries without broader acceptance.
  const mentionsKnownOnly =
    KNOWN_COUNTRY_NAMES.has(text.trim()) ||
    (/^(us|uk|usa|canada|australia|germany)(\s+only)?$/i.test(text.trim()) &&
      !OTHER_COUNTRY_TEXT.test(text));

  return !mentionsKnownOnly;
}

export function filterOtherCountryOffers(offers: NoOnesOffer[]): NoOnesOffer[] {
  return offers.filter(offerAcceptsOtherCountries);
}

/** Quick check whether any live NoOnes offers accept countries beyond standard tiers. */
export async function hasOtherCountryOffers(paymentMethod: string): Promise<boolean> {
  const scored = await loadScoredOffersForMedium({
    paymentMethod,
    cardCurrency: "USD",
    cardAmount: 100,
    medium: "PHYSICAL",
  });
  return filterOtherCountryOffers(scored.map((s) => s.offer)).length > 0;
}
