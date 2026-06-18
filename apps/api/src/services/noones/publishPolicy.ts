/** Max NoOnes buy offers for auto-importing a new gift card from NoOnes. */
export const MAX_OFFERS_FOR_PUBLISH = 10;

/** Minimum NoOnes offers for a country/currency tier to appear in the rate calculator (default). */
export const DEFAULT_MIN_COUNTRY_OFFERS_FOR_DISPLAY = 5;

/** Whether a card should appear in the catalog based on NoOnes offer count. */
export function isCardPublishable(offerCount: number, maxOffers?: number): boolean {
  if (offerCount < 1) return false;
  if (maxOffers != null) return offerCount <= maxOffers;
  return true;
}

/** Whether a country tier should be shown to users (rows stay in DB either way). */
export function isCountryTierDisplayable(
  countryOfferCount: number,
  minOffers = DEFAULT_MIN_COUNTRY_OFFERS_FOR_DISPLAY
): boolean {
  return countryOfferCount >= minOffers;
}
