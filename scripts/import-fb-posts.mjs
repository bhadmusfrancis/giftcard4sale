#!/usr/bin/env node
/**
 * Bulk-import rewritten Facebook posts as SEO landing pages.
 *
 * Usage:
 *   node scripts/import-fb-posts.mjs ./scripts/fb-posts.sample.json
 *
 * Env (or edit below):
 *   API_URL         (default http://localhost:4000)
 *   ADMIN_EMAIL     admin login email
 *   ADMIN_PASSWORD  admin login password
 *
 * Each entry in the JSON file:
 *   {
 *     "slug": "sell-lowes-gift-card",
 *     "title": "...",
 *     "metaTitle": "...",
 *     "metaDesc": "...",
 *     "bodyHtml": "<p>uniquely rewritten content…</p>",
 *     "sourceUrl": "https://web.facebook.com/share/p/XXXX/",
 *     "published": true
 *   }
 */
import fs from "node:fs";

const API_URL = process.env.API_URL || "http://localhost:4000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@giftcard4sale.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";

const file = process.argv[2] || "./scripts/fb-posts.sample.json";

async function main() {
  const pages = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(pages)) throw new Error("JSON file must be an array of pages");

  // 1) Login as admin
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed: ${login.error}`);
  const token = login.token;

  // 2) Import
  const res = await fetch(`${API_URL}/api/admin/landing/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pages }),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(`Import failed: ${out.error}`);
  console.log(`Imported ${out.imported} landing pages.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
