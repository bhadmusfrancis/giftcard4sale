import { createHash } from "crypto";
import { prisma } from "../prisma";
import { env } from "../env";
import { normalizeLocale } from "../lib/locale";

// ---------------------------------------------------------------------------
// OpenAI-backed translation. One small call powers both the trade-chat
// auto-translation and the on-demand UI string endpoint. Everything degrades
// gracefully: no API key, timeouts and provider errors all fall back to the
// original text so features never break.
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 12000;
const MAX_BATCH = 100;
const MAX_CHARS = 4000;

function hashSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function openAiJson(system: string, user: string): Promise<any | null> {
  if (!env.openai.apiKey) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.openai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openai.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("[translate] OpenAI", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[translate] OpenAI call failed:", (err as Error).message);
    return null;
  }
}

/**
 * Translate a chat message, detecting the source language. Returns the
 * detected language and the translation (identical to input when the text is
 * already in the target language). Returns null when translation is
 * unavailable — callers then store/send the original.
 */
export async function translateChatText(
  text: string,
  targetLang: string
): Promise<{ detectedLang: string; translated: string } | null> {
  const target = normalizeLocale(targetLang) || "en";
  const trimmed = text.trim().slice(0, MAX_CHARS);
  if (!trimmed) return null;

  const json = await openAiJson(
    "You are a translator inside a customer-support chat for a gift-card exchange. " +
      "Detect the source language of the user's message and translate it into the target language. " +
      "Keep meaning and tone faithful, keep numbers, gift-card codes, URLs and brand names unchanged. " +
      "Reply ONLY with JSON: {\"sourceLang\":\"<bcp47>\",\"translation\":\"<text>\"}. " +
      "If the message is already in the target language, return it unchanged as the translation.",
    `Target language: ${target}\n\nMessage:\n${trimmed}`
  );

  const translated = typeof json?.translation === "string" ? json.translation.trim() : "";
  if (!translated) return null;
  const detectedLang = normalizeLocale(json?.sourceLang) || null;
  return { detectedLang: detectedLang || "en", translated };
}

/**
 * Translate a batch of UI strings into `targetLang`, serving hits from the
 * TranslationCache table and persisting misses after one OpenAI call.
 * Returns a map of source text -> translated text (sources that failed are
 * simply absent; callers fall back to the source string).
 */
export async function translateUiStrings(
  texts: string[],
  targetLang: string
): Promise<Record<string, string>> {
  const target = normalizeLocale(targetLang);
  const sources = Array.from(
    new Set(texts.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean))
  ).slice(0, MAX_BATCH);
  if (!sources.length || !target || target === "en") return {};

  const hashed = sources.map((s) => ({ source: s, hash: hashSource(s) }));
  const cached = await prisma.translationCache.findMany({
    where: { targetLang: target, sourceHash: { in: hashed.map((h) => h.hash) } },
  });
  const out: Record<string, string> = {};
  const hit = new Set<string>();
  for (const row of cached) {
    out[row.source] = row.translated;
    hit.add(row.sourceHash);
  }

  const missing = hashed.filter((h) => !hit.has(h.hash));
  if (!missing.length) return out;

  const numbered = missing.map((h, i) => `${i + 1}. ${JSON.stringify(h.source)}`).join("\n");
  const json = await openAiJson(
    "You translate website UI strings for a gift-card exchange. " +
      "Translate each numbered English string into the target language. " +
      "Keep placeholders like {name} unchanged, keep brand names (GiftCard4Sale, USDT, card brands) unchanged, keep it concise. " +
      'Reply ONLY with JSON: {"translations":["<t1>","<t2>",...]} — same order and count as the input.',
    `Target language: ${target}\n\n${numbered}`
  );

  const list: unknown = json?.translations;
  if (!Array.isArray(list)) return out;

  const writes: Promise<unknown>[] = [];
  for (const [i, h] of missing.entries()) {
    const t = typeof list[i] === "string" ? (list[i] as string).trim() : "";
    if (!t) continue;
    out[h.source] = t;
    writes.push(
      prisma.translationCache
        .upsert({
          where: { targetLang_sourceHash: { targetLang: target, sourceHash: h.hash } },
          create: { targetLang: target, sourceHash: h.hash, source: h.source, translated: t },
          update: { translated: t },
        })
        .catch((err) => console.warn("[translate] cache write failed:", (err as Error).message))
    );
  }
  await Promise.all(writes);
  return out;
}
