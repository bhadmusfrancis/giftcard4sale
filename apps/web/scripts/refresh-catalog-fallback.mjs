#!/usr/bin/env node
/**
 * Refresh the bundled catalog fallback that keeps /cards populated when the API
 * is unreachable and the runtime snapshot cache is cold (e.g. a fresh serverless
 * instance). Run against a healthy API:
 *
 *   NEXT_PUBLIC_API_URL=https://api.giftcard4sale.com node scripts/refresh-catalog-fallback.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "catalog-fallback.json");

const res = await fetch(`${API_URL}/api/cards`);
if (!res.ok) throw new Error(`GET ${API_URL}/api/cards failed (${res.status})`);

const { cards } = await res.json();
if (!Array.isArray(cards) || cards.length === 0) {
  throw new Error("API returned an empty catalog — refusing to overwrite the fallback");
}

const payload = {
  generatedAt: new Date().toISOString(),
  cards: cards.map(({ id, name, slug, sellSlug, imageUrl, description }) => ({
    id,
    name,
    slug,
    sellSlug,
    ...(imageUrl ? { imageUrl } : {}),
    ...(description ? { description } : {}),
  })),
};

await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${payload.cards.length} cards to ${path.relative(process.cwd(), OUT)}`);
