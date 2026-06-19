import { Router } from "express";
import { fixDuplicateSellSlug } from "@gc4s/shared";
import { prisma } from "../prisma";
import { asyncHandler } from "../lib/http";

export const landingRouter = Router();

landingRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const pages = await prisma.landingPage.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      include: { cardType: { select: { slug: true, sellSlug: true, name: true } } },
    });
    res.json({
      pages: pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        metaDesc: p.metaDesc,
        cardType: p.cardType,
      })),
    });
  })
);

landingRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const candidates = req.params.slug.endsWith("-gift-card-gift-card")
      ? [req.params.slug, fixDuplicateSellSlug(req.params.slug)]
      : [req.params.slug];

    let page = null;
    for (const slug of candidates) {
      page = await prisma.landingPage.findFirst({
        where: { slug, published: true },
        include: { cardType: { select: { id: true, slug: true, sellSlug: true, name: true } } },
      });
      if (page) break;
    }
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json({
      page: {
        slug: page.slug,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDesc: page.metaDesc,
        bodyHtml: page.bodyHtml,
        sourceUrl: page.sourceUrl,
        cardType: page.cardType,
        updatedAt: page.updatedAt,
      },
    });
  })
);
