/**
 * Re-write published insight posts in place (same cards and batch dates, fresh content).
 *
 * Usage: npx tsx scripts/regenerate-insights.ts
 * Options:
 *   --date=YYYY-MM-DD  Only regenerate that batch (UTC)
 */
import { prisma } from "../src/prisma";
import { resolveProfile } from "../src/content/profiles";
import { formatResearchBrief, researchBrand } from "../src/services/insights/research";
import { writeInsightArticle } from "../src/content/insightWriter";

const dateArg = process.argv.find((a) => a.startsWith("--date="));
const batchFilter = dateArg ? new Date(dateArg.split("=")[1] + "T12:00:00Z") : undefined;

async function main() {
  const batches = await prisma.insightPost.groupBy({
    by: ["batchDate"],
    where: batchFilter ? { batchDate: batchFilter } : { published: true },
    orderBy: { batchDate: "asc" },
  });

  if (batches.length === 0) {
    console.log("No insight posts to regenerate.");
    return;
  }

  let updated = 0;

  for (const { batchDate } of batches) {
    const label = batchDate.toISOString().slice(0, 10);
    const posts = await prisma.insightPost.findMany({
      where: { batchDate },
      include: { cardType: { select: { name: true, slug: true, sellSlug: true } } },
      orderBy: { createdAt: "asc" },
    });

    console.log(`\nBatch ${label} (${posts.length} post(s))`);
    const siblingBrands: string[] = [];

    for (const post of posts) {
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
      });
      siblingBrands.push(profile.brand);

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

  console.log(`\nDone — regenerated ${updated} insight post(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().then(() => process.exit(0)));
