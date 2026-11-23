import { cache } from "react";
import { API_URL } from "@/lib/api";
import { isSeoLocale, normalizeLang } from "@/lib/locale";

type Dict = Record<string, string>;

const TRANSLATE_TIMEOUT_MS = 8_000;
const BATCH_SIZE = 50; // same batch size the client i18n provider uses

/**
 * Fetch a translation dictionary for a set of English source strings via the
 * API's /i18n/translate endpoint (OpenAI-backed, cached server-side in the
 * TranslationCache table). Wrapped in React cache() so generateMetadata and
 * the page render share one fetch — pass a module-level string array so the
 * argument identity is stable. Empty dict on any failure; callers then fall
 * back to English.
 */
export const getPageDict = cache(
  async (lang: string, texts: readonly string[]): Promise<Dict> => {
    const target = normalizeLang(lang);
    if (target === "en" || !isSeoLocale(target)) return {};

    const sources = Array.from(new Set(texts.filter(Boolean)));
    const out: Dict = {};
    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_URL}/api/i18n/translate`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: target, texts: batch }),
          cache: "no-store",
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { translations?: Dict };
        for (const source of batch) {
          const value = data.translations?.[source];
          if (typeof value === "string" && value.trim()) out[source] = value;
        }
      } catch {
        // timeout / API unreachable — keep whatever was already translated
      } finally {
        clearTimeout(timer);
      }
    }
    return out;
  }
);

/** Look up translated text, falling back to the English source. */
export function makeTr(dict: Dict) {
  return (text: string): string => dict[text] ?? text;
}

// ---------------------------------------------------------------------------
// HTML article translation (landing-page + insight bodies). Articles are too
// long for a single string and full of markup, so each leaf block element
// (paragraph, list item, heading…) is translated as one unit with its inline
// tags masked as {gc4s_N} placeholders — the translate prompt already promises
// to leave {placeholders} untouched. Units are cached in TranslationCache like
// every other string, so repeat renders cost a DB lookup, not an OpenAI call.
// ---------------------------------------------------------------------------

const LEAF_BLOCK_TAG = "p|h[1-6]|li|blockquote|td|th|dt|dd|figcaption|summary|caption";
const LEAF_BLOCK_RE = new RegExp(`<(${LEAF_BLOCK_TAG})(\\s[^>]*)?>([\\s\\S]*?)</\\1>`, "gi");
const NESTED_BLOCK_RE = new RegExp(`<(${LEAF_BLOCK_TAG})[\\s>/]`, "i");
const INLINE_TAG_RE = /<[^>]+>/g;
const UNIT_MASK = (i: number) => `\u0000${i}\u0000`;
const UNIT_MASK_RE = /\u0000(\d+)\u0000/g;
const INLINE_MASK_RE = /\{gc4s_?(\d+)\}/g;
const MAX_UNIT_CHARS = 1900; // the translate route rejects strings over 2000

function maskInlineTags(inner: string): { masked: string; tags: string[] } {
  const tags: string[] = [];
  const masked = inner.replace(INLINE_TAG_RE, (tag) => {
    tags.push(tag);
    return `{gc4s_${tags.length - 1}}`;
  });
  return { masked, tags };
}

function unmaskInlineTags(text: string, tags: string[]): string {
  return text.replace(INLINE_MASK_RE, (m, i) => tags[Number(i)] ?? m);
}

/** Split an over-limit masked unit at word boundaries (markers contain no
 *  spaces, so splitting on whitespace never cuts a placeholder in half). */
function splitOversized(masked: string): string[] {
  if (masked.length <= MAX_UNIT_CHARS) return [masked];
  const parts: string[] = [];
  let rest = masked;
  while (rest.length > MAX_UNIT_CHARS) {
    let cut = rest.lastIndexOf(". ", MAX_UNIT_CHARS);
    if (cut > 0) cut += 1;
    else cut = rest.lastIndexOf(" ", MAX_UNIT_CHARS);
    if (cut <= 0) cut = MAX_UNIT_CHARS;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

/**
 * Translate the text of an HTML document while preserving all markup. Leaf
 * blocks containing nested blocks, or no text, are left untouched. Falls back
 * to the original HTML on any translation failure.
 */
export const translateHtml = cache(async (lang: string, html: string): Promise<string> => {
  const target = normalizeLang(lang);
  if (target === "en" || !isSeoLocale(target) || !html.trim()) return html;

  const units: { masked: string; tags: string[] }[] = [];

  const masked = html.replace(LEAF_BLOCK_RE, (match, tag: string, attrs: string | undefined, inner: string) => {
    if (NESTED_BLOCK_RE.test(inner) || !inner.replace(INLINE_TAG_RE, "").trim()) return match;
    const { masked: maskedInner, tags } = maskInlineTags(inner);
    const parts = splitOversized(maskedInner.trim());
    const start = units.length;
    for (const p of parts) units.push({ masked: p, tags });
    return `<${tag}${attrs ?? ""}>${parts.map((_, j) => UNIT_MASK(start + j)).join(" ")}</${tag}>`;
  });

  if (!units.length) return html;
  const dict = await getPageDict(target, units.map((u) => u.masked));

  return masked.replace(UNIT_MASK_RE, (_m, i) => {
    const u = units[Number(i)];
    const t = dict[u.masked];
    return unmaskInlineTags(typeof t === "string" && t.trim() ? t : u.masked, u.tags);
  });
});
