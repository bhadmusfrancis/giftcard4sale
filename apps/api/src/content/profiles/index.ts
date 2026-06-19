import { GIFT_CARD_PROFILES as CORE } from "./core";
import { RETAIL_PROFILES } from "./retail";
import { GAMING_PROFILES } from "./gaming";
import { PREPAID_PROFILES } from "./prepaid";
import { TRAVEL_FOOD_DIGITAL_PROFILES } from "./travel-food-digital";
import { INACTIVE_PROFILES } from "./inactive-major";
import { resolveProfile as resolveCardProfile } from "../fallbackProfile";

export const ALL_GIFT_CARD_PROFILES = {
  ...CORE,
  ...RETAIL_PROFILES,
  ...GAMING_PROFILES,
  ...PREPAID_PROFILES,
  ...TRAVEL_FOOD_DIGITAL_PROFILES,
  ...INACTIVE_PROFILES,
};

/** Hand-written + dynamic fallback for any card slug. */
export function resolveProfile(slug: string, name: string) {
  return resolveCardProfile(slug, name, ALL_GIFT_CARD_PROFILES);
}

export type { GiftCardProfile, GeneratedArticle } from "../types";
export { buildArticle, buildArticleFromSlug } from "../articleGenerator";
