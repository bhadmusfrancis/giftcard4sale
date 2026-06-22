import type { MetadataRoute } from "next";
import { fetchSitemapFeed } from "@/lib/seo/sitemap-data";
import { absoluteUrl } from "@/lib/seo/site";

/** Regenerate often so crawlers see fresh lastmod after rate syncs and new insights. */
export const revalidate = 900;

type SitemapId = "static" | "catalog" | "insights";

export async function generateSitemaps() {
  return [{ id: "static" }, { id: "catalog" }, { id: "insights" }] satisfies { id: SitemapId }[];
}

function entry(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap[number] {
  return { url: absoluteUrl(path), lastModified, changeFrequency, priority };
}

export default async function sitemap(props: { id: SitemapId }): Promise<MetadataRoute.Sitemap> {
  const feed = await fetchSitemapFeed();
  const siteMod = new Date(feed.siteLastModified);

  if (props.id === "static") {
    return [
      entry("/", siteMod, "daily", 1),
      entry("/cards", siteMod, "daily", 0.9),
      entry("/insights", siteMod, "daily", 0.85),
      entry("/terms", siteMod, "monthly", 0.3),
      entry("/privacy", siteMod, "monthly", 0.3),
    ];
  }

  if (props.id === "catalog") {
    const seen = new Set<string>();
    const routes: MetadataRoute.Sitemap = [];

    for (const card of feed.cards) {
      const url = absoluteUrl(`/${card.sellSlug}`);
      if (seen.has(url)) continue;
      seen.add(url);
      routes.push(entry(`/${card.sellSlug}`, new Date(card.updatedAt), "daily", 0.8));
    }

    for (const page of feed.landingPages) {
      const url = absoluteUrl(`/${page.slug}`);
      if (seen.has(url)) continue;
      seen.add(url);
      routes.push(entry(`/${page.slug}`, new Date(page.updatedAt), "weekly", 0.75));
    }

    return routes;
  }

  return feed.insightPosts.map((post) =>
    entry(`/insights/${post.slug}`, new Date(post.lastModified), "weekly", 0.7)
  );
}
