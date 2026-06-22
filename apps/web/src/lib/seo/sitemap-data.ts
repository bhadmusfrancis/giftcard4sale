import { apiServer } from "@/lib/api";

export interface SitemapFeed {
  generatedAt: string;
  siteLastModified: string;
  cards: { sellSlug: string; updatedAt: string }[];
  landingPages: { slug: string; updatedAt: string }[];
  insightPosts: { slug: string; lastModified: string }[];
}

const EMPTY_FEED: SitemapFeed = {
  generatedAt: new Date(0).toISOString(),
  siteLastModified: new Date(0).toISOString(),
  cards: [],
  landingPages: [],
  insightPosts: [],
};

export async function fetchSitemapFeed(): Promise<SitemapFeed> {
  const data = await apiServer<SitemapFeed>("/seo/sitemap");
  return data ?? EMPTY_FEED;
}
