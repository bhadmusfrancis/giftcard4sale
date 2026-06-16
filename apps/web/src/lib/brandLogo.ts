// Maps gift card brands to their official domains so we can render real brand
// logos. Keyed by the card slug (see slugifyCardType in @gc4s/shared).
const BRAND_DOMAINS: Record<string, string> = {
  "apple-itunes": "apple.com",
  razer: "razer.com",
  "x-box": "xbox.com",
  steam: "steampowered.com",
  "chime-mail": "chime.com",
  doordash: "doordash.com",
  gamestop: "gamestop.com",
  macy: "macys.com",
  sephora: "sephora.com",
  nordstrom: "nordstrom.com",
  footlocker: "footlocker.com",
  playstation: "playstation.com",
  roblox: "roblox.com",
  google: "google.com",
  "cvs-pharmacy-dollar-general": "cvs.com",
  lowes: "lowes.com",
  amazon: "amazon.com",
  ebay: "ebay.com",
  walmart: "walmart.com",
  nike: "nike.com",
  visa: "visa.com",
  vanilla: "vanillagift.com",
};

/**
 * Resolve the official domain for a card. Falls back to "<slug>.com" for
 * brands that aren't in the curated map, which covers most single-word brands.
 */
export function brandDomain(slug: string): string {
  if (BRAND_DOMAINS[slug]) return BRAND_DOMAINS[slug];
  const base = slug.split("-")[0];
  return `${base}.com`;
}

/**
 * Ordered list of real-logo sources to try for a given card: a self-hosted
 * asset first (see apps/web/public/cards), then live favicon services as a
 * runtime fallback for brands without a bundled image.
 */
export function brandLogoSources(slug: string): string[] {
  const domain = brandDomain(slug);
  return [
    `/cards/${slug}.png`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}
