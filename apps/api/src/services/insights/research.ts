import { listResearchUrls, resolveBrandSources } from "../../content/brandSources";

export interface ResearchSnippet {
  label: string;
  url: string;
  title?: string;
  description?: string;
  ok: boolean;
}

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "GiftCard4Sale-InsightsBot/1.0 (+https://giftcard4sale.com/insights; research for editorial use)";

function extractMeta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1].trim());
  }
  return undefined;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function extractTitle(html: string): string | undefined {
  return (
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
  );
}

function extractDescription(html: string): string | undefined {
  return (
    extractMeta(html, "og:description") ||
    extractMeta(html, "twitter:description") ||
    extractMeta(html, "description")
  );
}

async function fetchPage(url: string): Promise<{ html: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) return null;
    const html = await res.text();
    if (html.length < 200) return null;
    return { html: html.slice(0, 250_000) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch official brand pages and extract titles/descriptions for editorial context. */
export async function researchBrand(
  slug: string,
  brand: string
): Promise<ResearchSnippet[]> {
  const sources = resolveBrandSources(slug, brand);
  const urls = listResearchUrls(sources);
  const results: ResearchSnippet[] = [];

  for (const { label, url } of urls) {
    const page = await fetchPage(url);
    if (!page) {
      results.push({ label, url, ok: false });
      continue;
    }
    results.push({
      label,
      url,
      title: extractTitle(page.html),
      description: extractDescription(page.html),
      ok: true,
    });
  }

  return results;
}

/** Format research into a plain-text brief for the writer. */
export function formatResearchBrief(snippets: ResearchSnippet[]): string {
  const lines: string[] = [];
  for (const s of snippets) {
    if (!s.ok) {
      lines.push(`- ${s.label} (${s.url}): could not fetch`);
      continue;
    }
    const parts = [`- ${s.label} (${s.url})`];
    if (s.title) parts.push(`  Title: ${s.title}`);
    if (s.description) parts.push(`  Summary: ${s.description}`);
    lines.push(parts.join("\n"));
  }
  return lines.join("\n");
}
