// Vercel cron: pushes the full indexable URL set to IndexNow so Bing, Yandex
// and engines sharing their indexes pick up new/changed pages immediately.
// Protected by Authorization: Bearer <CRON_SECRET> (Vercel sends it
// automatically when CRON_SECRET is set in the project env).

import { fetchSitemapFeed } from "@/lib/seo/sitemap-data";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";
import { indexNowKey } from "@/app/api/indexnow-key/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INDEXNOW_ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow"];
const CHUNK_SIZE = 10_000; // IndexNow hard limit per request

function sitemapUrls(feed: Awaited<ReturnType<typeof fetchSitemapFeed>>): string[] {
  const staticPaths = ["/", "/cards", "/insights", "/about", "/contact", "/terms", "/privacy"];
  const urls = new Set<string>(staticPaths.map(absoluteUrl));
  for (const c of feed.cards) urls.add(absoluteUrl(`/${c.sellSlug}`));
  for (const p of feed.landingPages) urls.add(absoluteUrl(`/${p.slug}`));
  for (const p of feed.insightPosts) urls.add(absoluteUrl(`/insights/${p.slug}`));
  return [...urls];
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const feed = await fetchSitemapFeed();
  const urls = sitemapUrls(feed);
  if (!urls.length) {
    return Response.json({ submitted: 0, reason: "empty feed" });
  }

  const key = indexNowKey();
  const body = (urlList: string[]) =>
    JSON.stringify({
      host: new URL(SITE_URL).host,
      key,
      keyLocation: `${SITE_URL}/api/indexnow-key`,
      urlList,
    });

  const results: { endpoint: string; status: number; urls: number }[] = [];
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      const chunk = urls.slice(i, i + CHUNK_SIZE);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: body(chunk),
        cache: "no-store",
      }).catch(() => null);
      results.push({ endpoint, status: res?.status ?? 0, urls: chunk.length });
    }
  }

  return Response.json({ submitted: urls.length, results });
}
