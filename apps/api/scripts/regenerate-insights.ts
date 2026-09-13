/**
 * Re-write published insight posts in place — same slug, card, and batch date,
 * fresh content. Past posts are never removed or re-slugged, so URLs already
 * indexed by search engines keep working.
 *
 * By default only template-written posts are rewritten, via the OpenAI writer,
 * scoped to the most recent batch.
 *
 * Usage: npx tsx scripts/regenerate-insights.ts [options]
 *   --days=N           Batches from the last N days (UTC).
 *   --date=YYYY-MM-DD  Only that batch (UTC).
 *   --all-batches      Every published batch.
 *   --include-ai       Also rewrite posts already written by OpenAI.
 *   --allow-fallback   Permit the template writer when OpenAI fails
 *                      (default: skip the post; requires OPENAI_API_KEY).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/prisma";
import { env } from "../src/env";
import { resolveProfile } from "../src/content/profiles";
import { formatResearchBrief, researchBrand } from "../src/services/insights/research";
import { isTemplateInsightBody, writeInsightArticle } from "../src/content/insightWriter";

const args = process.argv.slice(2);
const argVal = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const dateArg = argVal("date");
const daysArg = Number(argVal("days") || 0);
const allBatches = args.includes("--all-batches");
const includeAi = args.includes("--include-ai");
const allowFallback = args.includes("--allow-fallback");

async function main() {
  if (!allowFallback && !env.openai.apiKey) {
    console.error(
      "OPENAI_API_KEY is not set — cannot rewrite with OpenAI. Pass --allow-fallback to use the template writer instead."
    );
    process.exit(1);
  }

  const where: Prisma.InsightPostWhereInput = { published: true };
  if (dateArg) {
    where.batchDate = new Date(`${dateArg}T12:00:00Z`);
  } else if (daysArg > 0) {
    const cutoff = new Date();
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCDate(cutoff.getUTCDate() - (daysArg - 1));
    where.batchDate = { gte: cutoff };
  } else if (!allBatches) {
    const latest = await prisma.insightPost.findFirst({
      where: { published: true },
      orderBy: { batchDate: "desc" },
      select: { batchDate: true },
    });
    if (!latest) {
      console.log("No insight posts to regenerate.");
      return;
    }
    where.batchDate = latest.batchDate;
  }

  const batches = await prisma.insightPost.groupBy({
    by: ["batchDate"],
    where,
    orderBy: { batchDate: "asc" },
  });

  if (batches.length === 0) {
    console.log("No insight posts to regenerate.");
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const { batchDate } of batches) {
    const label = batchDate.toISOString().slice(0, 10);
    const posts = await prisma.insightPost.findMany({
      where: { batchDate, published: true },
      include: { cardType: { select: { name: true, slug: true, sellSlug: true } } },
      orderBy: { createdAt: "asc" },
    });

    console.log(`\nBatch ${label} (${posts.length} post(s))`);
    const siblingBrands: string[] = [];

    for (const post of posts) {
      if (!includeAi && !isTemplateInsightBody(post.bodyHtml)) {
        console.log(`  - ${post.slug} already OpenAI-written, skipped`);
        skipped++;
        continue;
      }

      const { cardType } = post;
      const profile = resolveProfile(cardType.slug, cardType.name);
      const snippets = await researchBrand(cardType.slug, profile.brand);
      const researchBrief = formatResearchBrief(snippets);

      const article = await writeInsightArticle({
        cardName: cardType.name,
        profile,
        snippets,
        researchBrief,
        sellSlug: cardType.sellSlug,
        batchDate,
        siblingBrands: [...siblingBrands],
        aiOnly: !allowFallback,
      });
      siblingBrands.push(profile.brand);

      if (!article) {
        console.log(`  - ${post.slug} skipped (OpenAI writer returned nothing)`);
        skipped++;
        continue;
      }

      await prisma.insightPost.update({
        where: { id: post.id },
        data: {
          title: article.title,
          metaTitle: article.metaTitle,
          metaDesc: article.metaDesc,
          excerpt: article.excerpt,
          bodyHtml: article.bodyHtml,
          sourceUrls: article.sourceUrls,
          publishedAt: new Date(),
        },
      });

      updated++;
      console.log(`  ✓ ${cardType.name} → /insights/${post.slug}`);
    }
  }

  console.log(`\nDone — regenerated ${updated} insight post(s), skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().then(() => process.exit(0)));
