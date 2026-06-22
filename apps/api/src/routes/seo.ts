import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../lib/http";
import { catalogCardWhere } from "../services/cardVisibility";

export const seoRouter = Router();

function maxDate(...dates: (Date | null | undefined)[]): Date {
  const times = dates.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  return times.length ? new Date(Math.max(...times)) : new Date();
}

/** Public sitemap feed — slug + lastmod for all indexable URLs. */
seoRouter.get(
  "/sitemap",
  asyncHandler(async (_req, res) => {
    const [cards, landingPages, insightPosts, latestRate] = await Promise.all([
      prisma.cardType.findMany({
        where: catalogCardWhere(),
        select: {
          sellSlug: true,
          updatedAt: true,
          noonesSyncedAt: true,
          rates: {
            where: { active: true },
            select: { updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: [{ offerCount: "desc" }, { name: "asc" }],
      }),
      prisma.landingPage.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.insightPost.findMany({
        where: { published: true },
        select: { slug: true, publishedAt: true, updatedAt: true },
        orderBy: [{ publishedAt: "desc" }],
      }),
      prisma.rate.findFirst({
        where: { active: true, cardType: catalogCardWhere() },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

    const cardEntries = cards.map((c) => ({
      sellSlug: c.sellSlug,
      updatedAt: maxDate(c.updatedAt, c.noonesSyncedAt, c.rates[0]?.updatedAt).toISOString(),
    }));

    const landingEntries = landingPages.map((p) => ({
      slug: p.slug,
      updatedAt: p.updatedAt.toISOString(),
    }));

    const insightEntries = insightPosts.map((p) => ({
      slug: p.slug,
      lastModified: maxDate(p.updatedAt, p.publishedAt).toISOString(),
    }));

    const siteLastModified = maxDate(
      latestRate?.updatedAt,
      landingPages[0]?.updatedAt,
      insightPosts[0] ? maxDate(insightPosts[0].updatedAt, insightPosts[0].publishedAt) : undefined,
      ...cardEntries.map((c) => new Date(c.updatedAt))
    );

    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json({
      generatedAt: new Date().toISOString(),
      siteLastModified: siteLastModified.toISOString(),
      cards: cardEntries,
      landingPages: landingEntries,
      insightPosts: insightEntries,
    });
  })
);
