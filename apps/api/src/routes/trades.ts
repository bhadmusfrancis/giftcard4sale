import { Router } from "express";
import { z } from "zod";
import { calculateRateQuote, PayoutCurrency } from "@gc4s/shared";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, requireVerified, requireActiveAccount, AuthedRequest } from "../lib/auth";
import { upload, chatUpload, fileUrl } from "../lib/upload";
import { getRateConfig } from "../services/rateConfig";
import { notify, notifyAdmins } from "../services/notify";
import { shouldSendTradeChatNotification } from "../services/notificationPreferences";
import { executeNoOnesResell, isAutoResellEnabled, receiptPolicyFromStored, parseStoredQuotes } from "../services/noones";
import { resolvePaymentMethodSlug } from "../services/noones/paymentMethods";
import { receiptTypeForQuote, storedNairaFromRate, validateCardAmountForRate } from "../services/rateQuoteResolve";
import { generateTradeNumber } from "../services/tradeNumber";
import { cancelTrade, canCancelTrade } from "../services/tradeCancel";
import { canCancelTrade as canCancelTradeCheck } from "@gc4s/shared";
import { assertUserCanTrade } from "../services/userModeration";
import { rejectTradeWithBadScore } from "../services/tradeRejection";
import {
  analyzeCardSubmission,
  attachmentCreateData,
  primaryDuplicateReason,
  submittedCodeCreateData,
} from "../services/cardValidation";

export const tradesRouter = Router();

const createSchema = z.object({
  rateId: z.string(),
  cardAmount: z.coerce.number().positive(),
  payoutCurrency: z.enum(["USDT", "NGN", "GHS"]),
  medium: z.enum(["PHYSICAL", "ECODE"]),
  receiptType: z.enum(["NONE", "CASH", "DEBIT"]).default("NONE"),
  ecodes: z.string().optional(),
  notes: z.string().max(2000).optional(),
  cardDenominations: z.string().min(1).max(200).optional(),
  otherCountryName: z.string().min(2).max(100).optional(),
});

tradesRouter.post(
  "/",
  requireAuth,
  requireVerified(),
  requireActiveAccount(),
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "receiptImages", maxCount: 4 },
  ]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(createSchema, req.body);

    try {
      await assertUserCanTrade(req.userId!);
    } catch (err) {
      return res.status(403).json({ error: (err as Error).message });
    }

    const rate = await prisma.rate.findUnique({ where: { id: data.rateId }, include: { cardType: true } });
    if (!rate || !rate.active) return res.status(404).json({ error: "Rate not found" });

    if (rate.medium !== data.medium) {
      return res.status(400).json({ error: "Card type does not match the selected rate." });
    }

    const amountError = validateCardAmountForRate(data.cardAmount, rate);
    if (amountError) return res.status(400).json({ error: amountError });

    const uploaded = req.files as { images?: Express.Multer.File[]; receiptImages?: Express.Multer.File[] };
    const cardFiles = uploaded?.images || [];
    const receiptFiles = uploaded?.receiptImages || [];

    if (data.medium === "ECODE") {
      if (!data.ecodes?.trim()) {
        return res.status(400).json({ error: "Please paste your e-code(s)" });
      }
    } else if (cardFiles.length === 0) {
      return res.status(400).json({ error: "Please upload at least one picture of the gift card" });
    }

    const receiptType = receiptTypeForQuote({
      receiptType: data.receiptType,
      preferNoReceipt: data.receiptType === "NONE",
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
    const paymentMethod = resolvePaymentMethodSlug(
      rate.cardType.slug,
      rate.cardType.name,
      rate.cardType.noonesPaymentMethod
    );
    const { requiresReceipt } = receiptPolicyFromStored({
      paymentMethod,
      storedQuotes: parseStoredQuotes(rate.storedQuotes),
      medium: data.medium,
    });

    if (requiresReceipt && data.receiptType === "NONE") {
      return res.status(400).json({
        error: "This card requires a purchase receipt. Go back and confirm you have a receipt, or choose a different offer.",
      });
    }

    if (data.receiptType !== "NONE" && receiptFiles.length === 0) {
      return res.status(400).json({ error: "Please upload a photo of your purchase receipt" });
    }

    if (rate.country === "Other" && !data.otherCountryName?.trim()) {
      return res.status(400).json({ error: "Please specify your card country" });
    }

    if (data.medium === "PHYSICAL" && !data.cardDenominations?.trim()) {
      return res.status(400).json({ error: "Please enter card denominations (e.g. 200x1, 50x4)" });
    }

    const config = await getRateConfig();
    const quote = calculateRateQuote({
      nairaPerUnit,
      cardAmount: data.cardAmount,
      payoutCurrency: data.payoutCurrency as PayoutCurrency,
      medium: rate.medium,
      rates: config.rates,
      reductions: config.reductions,
    });

    const analysis = await analyzeCardSubmission({
      cardFiles,
      receiptFiles,
      ecodes: data.ecodes,
    });
    const isDuplicate = analysis.duplicates.length > 0;
    const duplicateReason = isDuplicate ? primaryDuplicateReason(analysis.duplicates) : "";
    const rejectionReason = isDuplicate
      ? `${duplicateReason} Your account received a bad score for submitting a previously used card.`
      : undefined;

    const cardAnalyzed = analysis.cardFiles.filter((f) => !f.isReceipt);
    const receiptAnalyzed = analysis.cardFiles.filter((f) => f.isReceipt);

    const tradeNumber = await generateTradeNumber();
    const trade = await prisma.trade.create({
      data: {
        tradeNumber,
        userId: req.userId!,
        cardTypeId: rate.cardTypeId,
        country: rate.country,
        currency: rate.currency,
        medium: data.medium,
        receiptType: data.receiptType,
        cardAmount: data.cardAmount,
        cardDenominations: data.cardDenominations?.trim() || null,
        otherCountryName: data.otherCountryName?.trim() || null,
        payoutCurrency: data.payoutCurrency,
        nairaPerUnit,
        effectiveRate: quote.effectiveNairaPerUnit,
        quotedPayout: quote.payoutAmount,
        ecodes: data.ecodes,
        notes: data.notes,
        status: "PENDING",
        attachments: {
          create: [
            ...cardAnalyzed.map((af, i) =>
              attachmentCreateData(af, fileUrl(cardFiles[i]), cardFiles[i].originalname)
            ),
            ...receiptAnalyzed.map((af, i) =>
              attachmentCreateData(
                af,
                fileUrl(receiptFiles[i]),
                `receipt-${receiptFiles[i].originalname}`
              )
            ),
          ],
        },
        submittedCodes: {
          create: submittedCodeCreateData(analysis.codes),
        },
      },
      include: { attachments: true, cardType: true },
    });

    if (isDuplicate && rejectionReason) {
      await rejectTradeWithBadScore(trade.id, { rejectionReason });
      const rejected = await prisma.trade.findUnique({
        where: { id: trade.id },
        include: { attachments: true, cardType: true },
      });

      void notify({
        userId: req.userId!,
        title: "Trade rejected — duplicate card",
        body: rejectionReason,
        link: `/dashboard/trades/${trade.id}`,
        emailDetail: `Trade ID: ${trade.tradeNumber}`,
      }).catch((err) => console.error("[notify] duplicate reject user notify failed:", (err as Error).message));

      void notifyAdmins({
        title: "Duplicate card auto-rejected",
        body: `${trade.tradeNumber}: ${duplicateReason}`,
        link: `/admin/trades/${trade.id}`,
        emailDetail: `Trade ID: ${trade.tradeNumber}`,
      }).catch((err) => console.error("[notify] duplicate reject admin notify failed:", (err as Error).message));

      return res.status(201).json({
        trade: serializeTrade(rejected),
        autoRejected: true,
        message: rejectionReason,
      });
    }

    // Notify admins of a new pending trade.
    res.status(201).json({ trade: serializeTrade(trade) });

    void notifyAdmins({
      title: "New trade submitted",
      body: `${trade.tradeNumber}: ${rate.cardType.name} ${rate.country} ${data.cardAmount} ${rate.currency} → ${quote.payoutAmount} ${data.payoutCurrency}`,
      link: `/admin/trades/${trade.id}`,
      emailDetail: `Trade ID: ${trade.tradeNumber}`,
    }).catch((err) => console.error("[notify] trade admin notify failed:", (err as Error).message));

    const autoResell = await isAutoResellEnabled();

    void notify({
      userId: req.userId!,
      title: autoResell ? "Trade received — processing" : "Trade received — pending review",
      body: autoResell
        ? `Your ${rate.cardType.name} trade (${trade.tradeNumber}) is being processed. We'll credit your wallet once verification completes.`
        : `Your ${rate.cardType.name} trade (${trade.tradeNumber}) is pending review. Only submit cards you legally own with accurate details.`,
      link: `/dashboard/trades/${trade.id}`,
      emailDetail: `Trade ID: ${trade.tradeNumber}`,
    }).catch((err) => console.error("[notify] trade user notify failed:", (err as Error).message));

    // Auto-resell on NoOnes in the background (hidden from user).
    if (autoResell) {
      executeNoOnesResell(trade.id).catch((err) =>
        console.error(`NoOnes resell background error (${trade.id}):`, err.message)
      );
    }
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
  chatUpload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const text = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    const file = req.file;
    if (!text && !file) {
      return res.status(400).json({ error: "Message text or a file attachment is required" });
    }

    const trade = await prisma.trade.findUnique({ where: { id: req.params.id } });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const isOwner = trade.userId === req.userId;
    if (isOwner && (trade.status === "REJECTED" || trade.status === "CANCELLED")) {
      return res.status(403).json({ error: "This trade is closed. Chat is no longer available." });
    }

    const message = await prisma.tradeMessage.create({
      data: {
        tradeId: trade.id,
        senderId: req.userId!,
        body: text,
        ...(file
          ? {
              attachmentUrl: fileUrl(file),
              attachmentFilename: file.originalname,
              attachmentMimeType: file.mimetype,
            }
          : {}),
      },
      include: { sender: true },
    });

    const notifyBody = text || (file ? `Sent a file: ${file.originalname}` : "New message");

    const shouldNotify = await shouldSendTradeChatNotification(trade.id, message.id);
    if (shouldNotify) {
      const recipientId = req.userRole === "ADMIN" ? trade.userId : null;
      if (recipientId) {
        await notify({
          userId: recipientId,
          title: "New message on your trade",
          body: notifyBody,
          link: `/dashboard/trades/${trade.id}`,
          emailSubject: "New reply on your trade",
          emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
          category: "tradeChat",
          tradeId: trade.id,
        });
      } else {
        await notifyAdmins({
          title: "Trade chat reply",
          body: notifyBody,
          link: `/admin/trades/${trade.id}`,
          emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
          category: "tradeChat",
          tradeId: trade.id,
          messageId: message.id,
        });
      }
    }

    res.status(201).json({ message: serializeMessage(message) });
  })
);

tradesRouter.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const trade = await prisma.trade.findUnique({ where: { id: req.params.id } });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const check = canCancelTrade(trade, false);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const { reason } = validate(z.object({ reason: z.string().max(500).optional() }), req.body ?? {});
    await cancelTrade(trade.id, { reason });

    await notify({
      userId: trade.userId,
      title: "Trade cancelled",
      body: `Your trade ${trade.tradeNumber} has been cancelled.`,
      link: `/dashboard/trades/${trade.id}`,
      emailDetail: reason ? `Reason: ${reason}` : undefined,
    });

    await notifyAdmins({
      title: "Trade cancelled by user",
      body: `${trade.tradeNumber} was cancelled by the seller.`,
      link: `/admin/trades/${trade.id}`,
    });

    const updated = await prisma.trade.findUnique({
      where: { id: trade.id },
      include: { cardType: true, attachments: true },
    });
    res.json({ trade: serializeTrade(updated) });
  })
);

export function serializeTrade(t: any) {
  return {
    id: t.id,
    tradeNumber: t.tradeNumber,
    cardType: t.cardType ? { id: t.cardType.id, name: t.cardType.name, slug: t.cardType.slug } : undefined,
    country: t.country,
    otherCountryName: t.otherCountryName,
    currency: t.currency,
    medium: t.medium,
    receiptType: t.receiptType,
    cardAmount: Number(t.cardAmount),
    cardDenominations: t.cardDenominations,
    payoutCurrency: t.payoutCurrency,
    nairaPerUnit: Number(t.nairaPerUnit),
    effectiveRate: Number(t.effectiveRate),
    quotedPayout: Number(t.quotedPayout),
    finalPayout: t.finalPayout != null ? Number(t.finalPayout) : null,
    status: t.status,
    canCancel: canCancelTradeCheck(
      { status: t.status, noonesTradeHash: t.noonesTradeHash ?? null },
      false
    ).ok,
    ecodes: t.ecodes,
    notes: t.notes,
    rejectionReason: t.rejectionReason,
    notificationsMuted: t.notificationsMuted ?? false,
    attachments: t.attachments?.map((a: any) => ({ id: a.id, url: a.url, filename: a.filename })) ?? [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function serializeMessage(m: any) {
  return {
    id: m.id,
    body: m.body,
    attachmentUrl: m.attachmentUrl ?? null,
    attachmentFilename: m.attachmentFilename ?? null,
    attachmentMimeType: m.attachmentMimeType ?? null,
    createdAt: m.createdAt,
    sender: { id: m.sender.id, displayName: m.sender.displayName, role: m.sender.role },
  };
}
