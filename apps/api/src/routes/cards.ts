import { Router } from "express";
import { z } from "zod";
import { calculateRateQuote, fixDuplicateSellSlug, PayoutCurrency, ReceiptType } from "@gc4s/shared";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { catalogCardWhere } from "../services/cardVisibility";
import { buildRateFreshnessMeta, getRateConfig } from "../services/rateConfig";
import { parseStoredQuotes, receiptPolicyFromStored } from "../services/noones";
import { listCardCurrencyMetaForDisplay } from "../services/noones/currencyMeta";
import { resolvePaymentMethodSlug } from "../services/noones/paymentMethods";
import { resolveCardRegionLock, tierMatchesRegionLock } from "../services/noones/regionLock";
import { receiptTypeForQuote, storedNairaFromRate, validateCardAmountForRate } from "../services/rateQuoteResolve";

export const cardsRouter = Router();

async function loadCardBySlug(slug: string) {
  const candidates = slug.endsWith("-gift-card-gift-card")
    ? [slug, fixDuplicateSellSlug(slug)]
    : [slug];

  let card = null;
  for (const candidate of candidates) {
    card = await prisma.cardType.findFirst({
      where: {
        AND: [{ OR: [{ slug: candidate }, { sellSlug: candidate }] }, catalogCardWhere()],
      },
      include: {
        rates: {
          where: { active: true },
          orderBy: [{ countryOfferCount: "desc" }, { country: "asc" }, { minDenom: "asc" }],
        },
        landingPage: true,
      },
    });
    if (card) break;
  }
  if (!card) return null;

  const regionLock = resolveCardRegionLock(card.slug, card.name, card.noonesPaymentMethod);

  const visibleRates = regionLock
    ? card.rates.filter((r) => tierMatchesRegionLock(r, regionLock))
    : card.rates;

  const config = await getRateConfig();
  const rateMeta = buildRateFreshnessMeta(visibleRates, config.noonesRateRefreshMinutes);
  const currencyMeta = await listCardCurrencyMetaForDisplay(card.id);

  return {
    card: {
      id: card.id,
      name: card.name,
      slug: card.slug,
      sellSlug: card.sellSlug,
      description: card.description,
      imageUrl: card.imageUrl,
    },
    rates: visibleRates.map((r) => ({
      id: r.id,
      country: r.country,
      currency: r.currency,
      minDenom: r.minDenom,
      maxDenom: r.maxDenom,
      medium: r.medium,
      nairaPerUnit: Number(r.nairaPerUnit),
      storedQuotes: parseStoredQuotes(r.storedQuotes),
      countryOfferCount: r.countryOfferCount ?? 0,
      updatedAt: r.updatedAt,
      speed: r.speed,
    })),
    config,
    rateMeta,
    currencyMeta,
  };
}

cardsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const cards = await prisma.cardType.findMany({
      where: catalogCardWhere(q || undefined),
      orderBy: [{ offerCount: "desc" }, { tradeVolume: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, sellSlug: true, imageUrl: true, description: true },
    });
    res.json({ cards });
  })
);

const quoteSchema = z.object({
  rateId: z.string(),
  cardAmount: z.number().positive(),
  payoutCurrency: z.enum(["USDT", "NGN", "GHS"]),
  receiptType: z.enum(["NONE", "CASH", "DEBIT"]).optional(),
  /** When true, prefer offers that do not require a receipt (user has none). */
  preferNoReceipt: z.boolean().optional(),
});

// Fetch one card by slug or sellSlug (database only — no live NoOnes calls).
cardsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const payload = await loadCardBySlug(req.params.slug);
    if (!payload) return res.status(404).json({ error: "Card type not found" });
    res.json(payload);
  })
);

// Compute a payout quote for a specific rate row (stored NoOnes data only).
cardsRouter.post(
  "/quote",
  asyncHandler(async (req, res) => {
    const data = validate(quoteSchema, req.body);
    const rate = await prisma.rate.findUnique({
      where: { id: data.rateId },
      include: { cardType: true },
    });
    if (!rate || !rate.active) return res.status(404).json({ error: "Rate not found" });

    if (rate.minDenom == null && rate.maxDenom == null && rate.country !== "Other") {
      return res.status(400).json({ error: "Rate tier bounds are not available yet for this currency" });
    }

    const amountError = validateCardAmountForRate(data.cardAmount, rate);
    if (amountError) return res.status(400).json({ error: amountError });

    const config = await getRateConfig();
    const receiptType = receiptTypeForQuote({
      receiptType: data.receiptType as ReceiptType | undefined,
      preferNoReceipt: data.preferNoReceipt,
    });

    const ecodeSibling =
      rate.medium === "PHYSICAL"
        ? await prisma.rate.findFirst({
            where: {
              cardTypeId: rate.cardTypeId,
              country: rate.country,
              medium: "ECODE",
              minDenom: rate.minDenom,
              maxDenom: rate.maxDenom,
              active: true,
            },
          })
        : null;

    const nairaPerUnit = storedNairaFromRate(rate, receiptType, {
      ecodeRate: ecodeSibling
        ? { nairaPerUnit: Number(ecodeSibling.nairaPerUnit), storedQuotes: ecodeSibling.storedQuotes }
        : null,
    });
    const storedQuotes = parseStoredQuotes(rate.storedQuotes);
    const paymentMethod = resolvePaymentMethodSlug(
      rate.cardType.slug,
      rate.cardType.name,
      rate.cardType.noonesPaymentMethod
    );
    const receiptPolicy = receiptPolicyFromStored({ paymentMethod, storedQuotes, medium: rate.medium });

    const quote = calculateRateQuote({
      nairaPerUnit,
      cardAmount: data.cardAmount,
      payoutCurrency: data.payoutCurrency as PayoutCurrency,
      medium: rate.medium,
      rates: config.rates,
      reductions: config.reductions,
    });

    res.json({
      quote,
      rate: {
        country: rate.country,
        currency: rate.currency,
        medium: rate.medium,
        cardName: rate.cardType.name,
        updatedAt: rate.updatedAt,
      },
      receiptPolicy,
      quoteSource: "stored",
      storedQuotes,
      rateMeta: buildRateFreshnessMeta([rate], config.noonesRateRefreshMinutes),
    });
  })
);
