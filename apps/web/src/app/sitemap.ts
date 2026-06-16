import type { MetadataRoute } from "next";
import { apiServer } from "@/lib/api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 3600; // refresh hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/cards`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  const cardsData = await apiServer<{ cards: { sellSlug: string }[] }>("/cards");
  const cardRoutes: MetadataRoute.Sitemap = (cardsData?.cards ?? []).map((c) => ({
    url: `${SITE}/${c.sellSlug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const landingData = await apiServer<{ pages: { slug: string }[] }>("/landing");
  const landingRoutes: MetadataRoute.Sitemap = (landingData?.pages ?? []).map((p) => ({
    url: `${SITE}/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // De-dupe (a landing slug may equal a card sellSlug).
  const seen = new Set<string>();
  return [...staticRoutes, ...cardRoutes, ...landingRoutes].filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}
