import type { MetadataRoute } from "next";
import { fetchSitemapFeed } from "@/lib/seo/sitemap-data";
import { absoluteUrl } from "@/lib/seo/site";
import { LOCALIZED_PAGE_PATHS, languageAlternates } from "@/lib/locale";

/** Regenerate often so crawlers see fresh lastmod after rate syncs and new insights. */
export const revalidate = 900;

function entry(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
  languages?: Record<string, string>
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
    ...(languages ? { alternates: { languages } } : {}),
  };
}

/** hreflang map with absolute URLs for a route shared by all locales. */
function absoluteAlternates(path: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(languageAlternates(path)).map(([lang, p]) => [lang, absoluteUrl(p)])
  );
}

/**
 * One <url> per path carrying the full hreflang cluster. Locale variants are
 * not separate <url> entries: each page already emits hreflang links in its
 * HTML metadata, and IndexNow pushes every locale URL — repeating the cluster
 * on 20 per-locale entries ballooned the sitemap past Vercel's 20 MB ISR cap.
 */
function localizedEntries(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap {
  return [entry(path, lastModified, changeFrequency, priority, absoluteAlternates(path))];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const feed = await fetchSitemapFeed();
  const siteMod =
    feed.cards.length || feed.landingPages.length || feed.insightPosts.length
      ? new Date(feed.siteLastModified)
      : new Date();

  // Static paths available in every SEO locale.
  const localizedFreq: Record<string, MetadataRoute.Sitemap[number]["changeFrequency"]> = {
    "": "daily",
    "/cards": "daily",
    "/insights": "daily",
    "/about": "monthly",
    "/contact": "monthly",
  };
  const localizedPriority: Record<string, number> = {
    "": 1,
    "/cards": 0.9,
    "/insights": 0.85,
    "/about": 0.5,
    "/contact": 0.5,
  };

  const staticRoutes: MetadataRoute.Sitemap = [];
  for (const path of LOCALIZED_PAGE_PATHS) {
    staticRoutes.push(
      ...localizedEntries(
        path || "/",
        siteMod,
        localizedFreq[path] ?? "monthly",
        localizedPriority[path] ?? 0.5
      )
    );
  }

  staticRoutes.push(
    entry("/terms", siteMod, "monthly", 0.3),
    entry("/privacy", siteMod, "monthly", 0.3)
  );

  const seen = new Set<string>();
  const catalogRoutes: MetadataRoute.Sitemap = [];

  for (const card of feed.cards) {
    const path = `/${card.sellSlug}`;
    const url = absoluteUrl(path);
    if (seen.has(url)) continue;
    seen.add(url);
    catalogRoutes.push(
      ...localizedEntries(path, new Date(card.updatedAt), "daily", 0.8)
    );
  }

  for (const page of feed.landingPages) {
    const path = `/${page.slug}`;
    const url = absoluteUrl(path);
    if (seen.has(url)) continue;
    seen.add(url);
    catalogRoutes.push(
      ...localizedEntries(path, new Date(page.updatedAt), "weekly", 0.75)
    );
  }

  const insightRoutes: MetadataRoute.Sitemap = feed.insightPosts.flatMap((post) =>
    localizedEntries(`/insights/${post.slug}`, new Date(post.lastModified), "weekly", 0.7)
  );

  return [...staticRoutes, ...catalogRoutes, ...insightRoutes];
}
