import { API_URL } from "@/lib/api";

export interface SitemapFeed {
  generatedAt: string;
  siteLastModified: string;
  cards: { sellSlug: string; updatedAt: string }[];
  landingPages: { slug: string; updatedAt: string }[];
  insightPosts: { slug: string; lastModified: string }[];
}

export const EMPTY_SITEMAP_FEED: SitemapFeed = {
  generatedAt: new Date(0).toISOString(),
  siteLastModified: new Date(0).toISOString(),
  cards: [],
  landingPages: [],
  insightPosts: [],
};

const FETCH_TIMEOUT_MS = 8_000;

/** Fetch sitemap slugs from the API with timeout + ISR cache (avoids cold-start hangs). */
export async function fetchSitemapFeed(): Promise<SitemapFeed> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/api/seo/sitemap`, {
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!res.ok) return EMPTY_SITEMAP_FEED;
    return (await res.json()) as SitemapFeed;
  } catch {
    return EMPTY_SITEMAP_FEED;
  } finally {
    clearTimeout(timer);
  }
}
