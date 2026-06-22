import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../lib/http";
import { env } from "../env";
import { generateDailyInsights } from "../services/insights/generator";

export const insightsRouter = Router();

insightsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const batchDate = (req.query.batchDate as string | undefined)?.trim();

    const where = {
      published: true,
      ...(batchDate ? { batchDate: new Date(batchDate) } : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.insightPost.findMany({
        where,
        orderBy: [{ batchDate: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
        include: {
          cardType: { select: { name: true, slug: true, sellSlug: true, imageUrl: true } },
        },
      }),
      prisma.insightPost.count({ where }),
    ]);

    res.json({
      posts: posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        metaDesc: p.metaDesc,
        batchDate: p.batchDate.toISOString().slice(0, 10),
        publishedAt: p.publishedAt,
        cardType: p.cardType,
      })),
      total,
      limit,
      offset,
    });
  })
);

insightsRouter.get(
  "/batches",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.insightPost.groupBy({
      by: ["batchDate"],
      where: { published: true },
      _count: { id: true },
      orderBy: { batchDate: "desc" },
      take: 60,
    });
    res.json({
      batches: rows.map((r) => ({
        batchDate: r.batchDate.toISOString().slice(0, 10),
        count: r._count.id,
      })),
    });
  })
);

/** Secured cron trigger. Header: Authorization: Bearer <INSIGHTS_CRON_SECRET> */
insightsRouter.post(
  "/cron/generate",
  asyncHandler(async (req, res) => {
    const secret = env.insights.cronSecret;
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!secret || token !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await generateDailyInsights();
    res.json(result);
  })
);

insightsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const page = await prisma.insightPost.findFirst({
      where: { slug: req.params.slug, published: true },
      include: {
        cardType: { select: { id: true, name: true, slug: true, sellSlug: true, imageUrl: true } },
      },
    });
    if (!page) return res.status(404).json({ error: "Insight not found" });

    const related = await prisma.insightPost.findMany({
      where: { batchDate: page.batchDate, published: true, id: { not: page.id } },
      orderBy: { title: "asc" },
      take: 6,
      include: { cardType: { select: { name: true, sellSlug: true } } },
    });

    res.json({
      post: {
        slug: page.slug,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDesc: page.metaDesc,
        excerpt: page.excerpt,
        bodyHtml: page.bodyHtml,
        batchDate: page.batchDate.toISOString().slice(0, 10),
        sourceUrls: page.sourceUrls,
        publishedAt: page.publishedAt,
        cardType: page.cardType,
      },
      relatedSameDay: related.map((r) => ({
        slug: r.slug,
        title: r.title,
        cardType: r.cardType,
      })),
    });
  })
);
