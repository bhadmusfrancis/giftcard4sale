import { Router } from "express";
import { z } from "zod";
import { calculateRateQuote, PayoutCurrency } from "@gc4s/shared";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { getRateConfig } from "../services/rateConfig";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { notify } from "../services/notify";
import { env } from "../env";

export const cardsRouter = Router();

cardsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const cards = await prisma.cardType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, sellSlug: true, imageUrl: true, description: true },
    });
    res.json({ cards });
  })
);

// Fetch one card by slug or sellSlug, including active rates.
cardsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;
    const card = await prisma.cardType.findFirst({
      where: { OR: [{ slug }, { sellSlug: slug }], active: true },
      include: {
        rates: {
          where: { active: true },
          orderBy: [{ country: "asc" }, { minDenom: "asc" }],
        },
        landingPage: true,
      },
    });
    if (!card) return res.status(404).json({ error: "Card type not found" });

    const config = await getRateConfig();
    res.json({
      card: {
        id: card.id,
        name: card.name,
        slug: card.slug,
        sellSlug: card.sellSlug,
        description: card.description,
        imageUrl: card.imageUrl,
      },
      rates: card.rates.map((r) => ({
        id: r.id,
        country: r.country,
        currency: r.currency,
        minDenom: r.minDenom,
        maxDenom: r.maxDenom,
        medium: r.medium,
        nairaPerUnit: Number(r.nairaPerUnit),
      })),
      config,
    });
  })
);

const quoteSchema = z.object({
  rateId: z.string(),
  cardAmount: z.number().positive(),
  payoutCurrency: z.enum(["USDT", "NGN", "GHS"]),
});

// Compute a payout quote for a specific rate row.
cardsRouter.post(
  "/quote",
  asyncHandler(async (req, res) => {
    const data = validate(quoteSchema, req.body);
    const rate = await prisma.rate.findUnique({ where: { id: data.rateId } });
    if (!rate || !rate.active) return res.status(404).json({ error: "Rate not found" });

    const config = await getRateConfig();
    const quote = calculateRateQuote({
      nairaPerUnit: Number(rate.nairaPerUnit),
      cardAmount: data.cardAmount,
      payoutCurrency: data.payoutCurrency as PayoutCurrency,
      medium: rate.medium,
      rates: config.rates,
      reductions: config.reductions,
    });
    res.json({ quote, rate: { country: rate.country, currency: rate.currency, medium: rate.medium } });
  })
);

// Logged-in users can request a rate that isn't listed.
cardsRouter.post(
  "/request-rate",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(
      z.object({
        cardType: z.string().min(1),
        country: z.string().min(1),
        details: z.string().optional(),
      }),
      req.body
    );
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    // Notify all admins.
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await Promise.all(
      admins.map((a) =>
        notify({
          userId: a.id,
          title: "New rate request",
          body: `${user?.displayName || user?.email} requested a rate for ${data.cardType} (${data.country}). ${data.details ?? ""}`,
          link: "/admin/rates",
          push: true,
          email: true,
        })
      )
    );
    res.json({ ok: true, message: "Your rate request has been sent. We'll get back to you shortly." });
  })
);
