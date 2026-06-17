/**
 * Download brand logos for all card types into apps/web/public/cards/.
 *
 * Usage: npx tsx scripts/fetch-card-logos.ts
 */
import fs from "fs";
import path from "path";
import { prisma } from "../apps/api/src/prisma";
import {
  brandDomainForSlug,
  cardSlugStem,
  simpleIconSlugForCard,
} from "../apps/web/src/lib/cardBrandDomains";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "apps/web/public/cards");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tryFetch(url: string): Promise<{ ok: true; buf: Buffer; type: string } | { ok: false }> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return { ok: false };
    const type = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80) return { ok: false };
    return { ok: true, buf, type };
  } catch {
    return { ok: false };
  }
}

async function fetchLogo(slug: string): Promise<"svg" | "png" | null> {
  const domain = brandDomainForSlug(slug);
  const iconSlug = simpleIconSlugForCard(slug);
  const stem = cardSlugStem(slug);
  const iconCandidates = [...new Set([iconSlug, stem.replace(/-/g, ""), stem])];

  for (const candidate of iconCandidates) {
    const result = await tryFetch(`https://cdn.simpleicons.org/${candidate}`);
    if (result.ok && (result.type.includes("svg") || result.buf[0] === 0x3c)) {
      fs.writeFileSync(path.join(OUT_DIR, `${slug}.svg`), result.buf);
      return "svg";
    }
    await sleep(40);
  }

  const pngSources = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://logo.clearbit.com/${domain}`,
  ];

  for (const url of pngSources) {
    const result = await tryFetch(url);
    if (result.ok) {
      fs.writeFileSync(path.join(OUT_DIR, `${slug}.png`), result.buf);
      return "png";
    }
    await sleep(40);
  }

  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const cards = await prisma.cardType.findMany({
    where: { active: true },
    select: { slug: true, name: true },
    orderBy: { slug: "asc" },
  });

  let svg = 0;
  let png = 0;
  const failed: string[] = [];

  console.log(`Fetching logos for ${cards.length} card types…\n`);

  for (const card of cards) {
    const existingSvg = fs.existsSync(path.join(OUT_DIR, `${card.slug}.svg`));
    const existingPng = fs.existsSync(path.join(OUT_DIR, `${card.slug}.png`));
    if (existingSvg || existingPng) {
      if (existingSvg) svg++;
      else png++;
      continue;
    }

    const kind = await fetchLogo(card.slug);
    if (kind === "svg") {
      svg++;
      console.log(`  ✓ ${card.name} (${card.slug}) — SVG`);
    } else if (kind === "png") {
      png++;
      console.log(`  ✓ ${card.name} (${card.slug}) — PNG`);
    } else {
      failed.push(`${card.name} (${card.slug})`);
      console.log(`  ✗ ${card.name} (${card.slug}) — no logo found`);
    }
    await sleep(60);
  }

  console.log(`\nDone: ${svg} SVG, ${png} PNG, ${failed.length} failed`);
  if (failed.length) {
    console.log("\nFailed:");
    for (const f of failed) console.log(`  - ${f}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
