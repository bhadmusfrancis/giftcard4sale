import { brandDomainForSlug } from "./cardBrandDomains";

/**
 * Resolve the official domain for a card. Falls back to "<slug>.com" for
 * brands that aren't in the curated map, which covers most single-word brands.
 */
export function brandDomain(slug: string): string {
  return brandDomainForSlug(slug);
}

/**
 * Ordered list of real-logo sources to try for a given card: a self-hosted
 * asset first (see apps/web/public/cards), then live favicon services as a
 * runtime fallback for brands without a bundled image.
 */
export function brandLogoSources(slug: string): string[] {
  const domain = brandDomain(slug);
  return [
    `/cards/${slug}.svg`,
    `/cards/${slug}.png`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}
