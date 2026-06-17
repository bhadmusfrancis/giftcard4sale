/** Max NoOnes buy offers for a gift card to be published on GiftCard4Sale. */
export const MAX_OFFERS_FOR_PUBLISH = 10;

/** Cards with 1–maxOffers NoOnes offers are published; 0 or >maxOffers stay draft until the count is in range. */
export function isCardPublishable(
  offerCount: number,
  maxOffers: number = MAX_OFFERS_FOR_PUBLISH
): boolean {
  return offerCount >= 1 && offerCount <= maxOffers;
}
