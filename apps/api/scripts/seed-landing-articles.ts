/**
 * Seed SEO landing pages with unique 600+ word articles for every card type.
 *
 * Usage: npx tsx scripts/seed-landing-articles.ts
 * Options:
 *   --dry-run   Print stats without writing to DB
 *   --force     Overwrite existing landing pages
 *   --active    Only seed active card types (default: all cards)
 */
import { PrismaClient } from "@prisma/client";
import { resolveProfile, buildArticle } from "../src/content/profiles";
import { ensureCardSeoLandingPagesPublished } from "../src/services/cardVisibility";

const prisma = new PrismaClient();
const MIN_WORDS = 600;
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const activeOnly = process.argv.includes("--active");

async function main() {
  const cards = await prisma.cardType.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
    include: { landingPage: true },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let tooShort = 0;
  let dynamic = 0;
  let handWritten = 0;

  for (const card of cards) {
    const profile = resolveProfile(card.slug, card.name);
    if (!ALL_PROFILES.has(card.slug)) dynamic++;
    else handWritten++;

    const article = buildArticle(profile, card.name);
    if (article.wordCount < MIN_WORDS) {
      tooShort++;
      console.warn(`⚠ ${card.slug}: only ${article.wordCount} words (min ${MIN_WORDS})`);
    }

    if (card.landingPage && !force) {
      skipped++;
      continue;
    }

    const data = {
      slug: card.sellSlug,
      title: article.title,
      metaTitle: article.metaTitle,
      metaDesc: article.metaDesc,
      bodyHtml: article.bodyHtml,
      cardTypeId: card.id,
      published: true,
    };

    if (dryRun) {
      const tag = ALL_PROFILES.has(card.slug) ? "written" : "dynamic";
      console.log(`[dry-run] ${card.sellSlug} (${tag}, active=${card.active}) — ${article.wordCount} words`);
      continue;
    }

    if (card.landingPage) {
      await prisma.landingPage.update({ where: { id: card.landingPage.id }, data });
      updated++;
    } else {
      await prisma.landingPage.create({ data });
      created++;
    }
  }

  console.log("\n--- Seed summary ---");
  console.log(`Scope:              ${activeOnly ? "active only" : "all cards"}`);
  console.log(`Cards processed:    ${cards.length}`);
  console.log(`Hand-written prof:  ${handWritten}`);
  console.log(`Dynamic prof:       ${dynamic}`);
  console.log(`Created:            ${created}`);
  console.log(`Updated:            ${updated}`);
  console.log(`Skipped (exists):   ${skipped}${force ? "" : " — use --force to overwrite"}`);
  console.log(`Below ${MIN_WORDS} words:  ${tooShort}`);

  if (!dryRun) {
    const republished = await ensureCardSeoLandingPagesPublished();
    if (republished > 0) console.log(`Re-published:       ${republished}`);
  }

  if (dryRun) console.log("\n(dry-run — no database changes made)");
}

// Slugs with dedicated hand-written profiles (not dynamic fallback).
import { ALL_GIFT_CARD_PROFILES } from "../src/content/profiles";
const ALL_PROFILES = new Set(Object.keys(ALL_GIFT_CARD_PROFILES));

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
