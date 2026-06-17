import {
  brandDomainForSlug,
  cardSlugStem,
  simpleIconSlugForCard,
  CARD_BRAND_DOMAINS,
} from "./cardBrandDomains";

/** Slug aliases where the DB slug differs from bundled public/cards filenames. */
const SLUG_ALIASES: Record<string, string[]> = {
  "apple-itunes": ["itunes-gift-card", "apple-gift-card-us-only", "apple-store-gift-card"],
  amazon: ["amazon-gift-card"],
  google: ["google-play-gift-card"],
  steam: ["steam-wallet-gift-card"],
  playstation: ["playstation-network-gift-card"],
  xbox: ["xbox-gift-card", "x-box"],
  walmart: ["walmart-gift-card", "walmart-visa-gift-card"],
  ebay: ["ebay-gift-card"],
  nike: ["nike-gift-card"],
  sephora: ["sephora-gift-card"],
  nordstrom: ["nordstrom-gift-card"],
  footlocker: ["footlocker-sports-gift-card"],
  gamestop: ["gamestop-gift-card"],
  roblox: ["roblox-game-card"],
  doordash: ["doordash-gift-card"],
  vanilla: ["onevanilla-visa-mastercard-gift-card"],
  visa: ["visa-gift-card"],
  lowes: ["lowe-s-gift-card"],
  macy: ["macy-s-gift-card"],
  tesco: ["tesco-gift-card"],
  razer: ["razer-gold-gift-card"],
};

/**
 * Resolve the official domain for a card. Falls back to "<slug>.com" for
 * brands that aren't in the curated map, which covers most single-word brands.
 */
export function brandDomain(slug: string): string {
  return brandDomainForSlug(slug);
}

function slugVariants(slug: string): string[] {
  const stem = cardSlugStem(slug);
  const aliases = SLUG_ALIASES[slug] ?? SLUG_ALIASES[stem] ?? [];
  const domainKeys = Object.keys(CARD_BRAND_DOMAINS).filter(
    (k) => k === slug || k === stem || k.startsWith(`${stem}-`) || stem.startsWith(cardSlugStem(k))
  );
  return [...new Set([slug, stem, ...aliases, ...domainKeys])];
}

function localCardAssets(slug: string): string[] {
  const urls: string[] = [];
  for (const variant of slugVariants(slug)) {
    urls.push(`/cards/${variant}.svg`, `/cards/${variant}.png`);
  }
  return urls;
}

/**
 * Ordered list of real-logo sources to try for a given card: a self-hosted
 * asset first (see apps/web/public/cards), then Simple Icons CDN, then live
 * favicon services as a runtime fallback for brands without a bundled image.
 */
export function brandLogoSources(slug: string): string[] {
  const domain = brandDomain(slug);
  const iconSlug = simpleIconSlugForCard(slug);
  return [
    ...localCardAssets(slug),
    `https://cdn.simpleicons.org/${iconSlug}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}
