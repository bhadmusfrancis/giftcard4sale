import { Router } from "express";
import { z } from "zod";
import { calculateRateQuote, PayoutCurrency } from "@gc4s/shared";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, requireVerified, AuthedRequest } from "../lib/auth";
import { upload, fileUrl } from "../lib/upload";
import { getRateConfig } from "../services/rateConfig";
import { notify } from "../services/notify";
import { executeNoOnesResell, isNoOnesConfigured } from "../services/noones";

export const tradesRouter = Router();

const createSchema = z.object({
  rateId: z.string(),
  cardAmount: z.coerce.number().positive(),
  payoutCurrency: z.enum(["USDT", "NGN", "GHS"]),
  medium: z.enum(["PHYSICAL", "ECODE"]),
  receiptType: z.enum(["NONE", "CASH", "DEBIT"]).default("NONE"),
  ecodes: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

tradesRouter.post(
  "/",
  requireAuth,
  requireVerified(),
  upload.array("images", 8),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(createSchema, req.body);
    const rate = await prisma.rate.findUnique({ where: { id: data.rateId }, include: { cardType: true } });
    if (!rate || !rate.active) return res.status(404).json({ error: "Rate not found" });

    const files = (req.files as Express.Multer.File[]) || [];
    if (data.medium === "ECODE") {
      if (!data.ecodes && files.length === 0) {
        return res.status(400).json({ error: "Please paste the e-codes or upload code images" });
      }
    } else if (files.length === 0) {
      return res.status(400).json({ error: "Please upload at least one picture of the gift card" });
    }

    const config = await getRateConfig();
    const quote = calculateRateQuote({
      nairaPerUnit: Number(rate.nairaPerUnit),
      cardAmount: data.cardAmount,
      payoutCurrency: data.payoutCurrency as PayoutCurrency,
      medium: rate.medium,
      rates: config.rates,
      reductions: config.reductions,
    });

    const trade = await prisma.trade.create({
      data: {
        userId: req.userId!,
        cardTypeId: rate.cardTypeId,
        country: rate.country,
        currency: rate.currency,
        medium: data.medium,
        receiptType: data.receiptType,
        cardAmount: data.cardAmount,
        payoutCurrency: data.payoutCurrency,
        nairaPerUnit: rate.nairaPerUnit,
        effectiveRate: quote.effectiveNairaPerUnit,
        quotedPayout: quote.payoutAmount,
        ecodes: data.ecodes,
        notes: data.notes,
        status: "PENDING",
        attachments: {
          create: files.map((f) => ({
            url: fileUrl(f),
            filename: f.originalname,
          })),
        },
      },
      include: { attachments: true, cardType: true },
    });

    // Notify admins of a new pending trade.
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await Promise.all(
      admins.map((a) =>
        notify({
          userId: a.id,
          title: "New trade submitted",
          body: `${rate.cardType.name} ${rate.country} ${data.cardAmount} ${rate.currency} -> ${quote.payoutAmount} ${data.payoutCurrency}`,
          link: `/admin/trades/${trade.id}`,
        })
      )
    );

    // Confirm to the user.
    await notify({
      userId: req.userId!,
      title: isNoOnesConfigured() ? "Trade received — processing" : "Trade received - pending review",
      body: isNoOnesConfigured()
        ? `Your ${rate.cardType.name} trade is being processed. We'll credit your wallet once verification completes.`
        : `Your ${rate.cardType.name} trade is pending. We'll review your card shortly. Note: uploading used/invalid cards harms your trust score.`,
      link: `/dashboard/trades/${trade.id}`,
    });

    // Auto-resell on NoOnes in the background (hidden from user).
    if (isNoOnesConfigured()) {
      executeNoOnesResell(trade.id).catch((err) =>
        console.error(`NoOnes resell background error (${trade.id}):`, err.message)
      );
    }

    res.status(201).json({ trade: serializeTrade(trade) });
  })
);

tradesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const trades = await prisma.trade.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      include: { cardType: true, attachments: true },
    });
    res.json({ trades: trades.map(serializeTrade) });
  })
);

tradesRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id },
      include: {
        cardType: true,
        attachments: true,
        messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
      },
    });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ trade: serializeTrade(trade), messages: trade.messages.map(serializeMessage) });
  })
);

// Trade chat (user <-> admin)
tradesRouter.post(
  "/:id/messages",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { body } = validate(z.object({ body: z.string().min(1).max(2000) }), req.body);
    const trade = await prisma.trade.findUnique({ where: { id: req.params.id } });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const message = await prisma.tradeMessage.create({
      data: { tradeId: trade.id, senderId: req.userId!, body },
      include: { sender: true },
    });

    // Notify the other party.
    const recipientId = req.userRole === "ADMIN" ? trade.userId : null;
    if (recipientId) {
      await notify({
        userId: recipientId,
        title: "New message on your trade",
        body,
        link: `/dashboard/trades/${trade.id}`,
      });
    } else {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      await Promise.all(
        admins.map((a) =>
          notify({ userId: a.id, title: "Trade chat reply", body, link: `/admin/trades/${trade.id}`, email: false })
        )
      );
    }

    res.status(201).json({ message: serializeMessage(message) });
  })
);

export function serializeTrade(t: any) {
  return {
    id: t.id,
    cardType: t.cardType ? { id: t.cardType.id, name: t.cardType.name, slug: t.cardType.slug } : undefined,
    country: t.country,
    currency: t.currency,
    medium: t.medium,
    receiptType: t.receiptType,
    cardAmount: Number(t.cardAmount),
    payoutCurrency: t.payoutCurrency,
    nairaPerUnit: Number(t.nairaPerUnit),
    effectiveRate: Number(t.effectiveRate),
    quotedPayout: Number(t.quotedPayout),
    finalPayout: t.finalPayout != null ? Number(t.finalPayout) : null,
    status: t.status,
    ecodes: t.ecodes,
    notes: t.notes,
    rejectionReason: t.rejectionReason,
    attachments: t.attachments?.map((a: any) => ({ id: a.id, url: a.url, filename: a.filename })) ?? [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function serializeMessage(m: any) {
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt,
    sender: { id: m.sender.id, displayName: m.sender.displayName, role: m.sender.role },
  };
}
