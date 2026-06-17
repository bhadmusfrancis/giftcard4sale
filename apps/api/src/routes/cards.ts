import { Router } from "express";
import { z } from "zod";
import { calculateRateQuote, PayoutCurrency } from "@gc4s/shared";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { getRateConfig } from "../services/rateConfig";
import { isNoOnesConfigured, resolveOfferForCard } from "../services/noones";

export const cardsRouter = Router();

cardsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const cards = await prisma.cardType.findMany({
      where: {
        active: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
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
    const rate = await prisma.rate.findUnique({
      where: { id: data.rateId },
      include: { cardType: true },
    });
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

    let requiresReceipt = false;
    if (isNoOnesConfigured()) {
      const market = await resolveOfferForCard({
        cardSlug: rate.cardType.slug,
        cardName: rate.cardType.name,
        paymentMethodOverride: rate.cardType.noonesPaymentMethod,
        cardCurrency: rate.currency,
        cardAmount: data.cardAmount,
        medium: rate.medium,
      });
      requiresReceipt = market?.requiresReceipt ?? false;
    }

    res.json({
      quote,
      rate: { country: rate.country, currency: rate.currency, medium: rate.medium },
      receiptPolicy: { requiresReceipt },
    });
  })
);
