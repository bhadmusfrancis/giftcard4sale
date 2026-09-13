import { prisma } from "../../prisma";
import { resolveProfile } from "../../content/profiles";
import { formatResearchBrief, researchBrand } from "./research";
import { writeInsightArticle } from "../../content/insightWriter";
import { pickDailyCards, DAILY_INSIGHT_COUNT, type CardPick } from "./rotation";

export interface GenerateInsightsResult {
  batchDate: string;
  created: number;
  skipped: number;
  cards: { name: string; slug: string; insightSlug: string }[];
  cycleNumber: number;
  cycleReset: boolean;
}

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function insightSlug(cardSlug: string, batchDate: Date): string {
  const iso = batchDate.toISOString().slice(0, 10);
  return `${cardSlug}-insights-${iso}`;
}

export interface GenerateOptions {
  /** Target batch date (UTC date only). Defaults to today UTC. */
  batchDate?: Date;
  /** If true, do not write to DB. */
  dryRun?: boolean;
  /** If true, regenerate even when posts exist for the date. */
  force?: boolean;
  /** Override card count (default 7). */
  count?: number;
}

/** Generate daily insight posts for active gift cards. Idempotent per batch date. */
export async function generateDailyInsights(opts: GenerateOptions = {}): Promise<GenerateInsightsResult> {
  const batchDate = toDateOnly(opts.batchDate ?? new Date());
  const count = opts.count ?? DAILY_INSIGHT_COUNT;

  const existingPosts = await prisma.insightPost.findMany({
    where: { batchDate, published: true },
    include: { cardType: { select: { id: true, name: true, slug: true, sellSlug: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (existingPosts.length >= count && !opts.force) {
    return {
      batchDate: batchDate.toISOString().slice(0, 10),
      created: 0,
      skipped: existingPosts.length,
      cards: existingPosts.map((p) => ({
        name: p.cardType.name,
        slug: p.cardType.slug,
        insightSlug: p.slug,
      })),
      cycleNumber: 0,
      cycleReset: false,
    };
  }

  // Past posts are never deleted — indexed URLs must keep working. On force the
  // existing batch is rewritten in place (same card, same slug); new cards only
  // ever top the batch up to `count`.
  const coveredIds = new Set(existingPosts.map((p) => p.cardTypeId));
  const cards: CardPick[] = opts.force ? existingPosts.map((p) => p.cardType) : [];
  let cycleNumber = 0;
  let cycleReset = false;

  const needed = count - existingPosts.length;
  if (needed > 0) {
    const picked = await pickDailyCards(needed, coveredIds);
    cards.push(...picked.cards);
    cycleNumber = picked.cycleNumber;
    cycleReset = picked.cycleReset;
  }

  const created: GenerateInsightsResult["cards"] = [];
  let skipped = 0;
  const siblingBrands: string[] = [];

  for (const card of cards) {
    const slug = insightSlug(card.slug, batchDate);
    const profile = resolveProfile(card.slug, card.name);
    const snippets = await researchBrand(card.slug, profile.brand);
    const researchBrief = formatResearchBrief(snippets);

    const article = await writeInsightArticle({
      cardName: card.name,
      profile,
      snippets,
      researchBrief,
      sellSlug: card.sellSlug,
      batchDate,
      siblingBrands: [...siblingBrands],
    });
    siblingBrands.push(profile.brand);
    if (!article) {
      skipped++;
      continue;
    }

    if (opts.dryRun) {
      created.push({ name: card.name, slug: card.slug, insightSlug: slug });
      continue;
    }

    await prisma.insightPost.upsert({
      where: { cardTypeId_batchDate: { cardTypeId: card.id, batchDate } },
      create: {
        slug,
        title: article.title,
        metaTitle: article.metaTitle,
        metaDesc: article.metaDesc,
        excerpt: article.excerpt,
        bodyHtml: article.bodyHtml,
        cardTypeId: card.id,
        batchDate,
        sourceUrls: article.sourceUrls,
        published: true,
        publishedAt: new Date(),
      },
      update: {
        slug,
        title: article.title,
        metaTitle: article.metaTitle,
        metaDesc: article.metaDesc,
        excerpt: article.excerpt,
        bodyHtml: article.bodyHtml,
        sourceUrls: article.sourceUrls,
        published: true,
        publishedAt: new Date(),
      },
    });

    created.push({ name: card.name, slug: card.slug, insightSlug: slug });
  }

  return {
    batchDate: batchDate.toISOString().slice(0, 10),
    created: created.length,
    skipped,
    cards: created,
    cycleNumber,
    cycleReset,
  };
}
