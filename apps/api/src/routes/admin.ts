import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { parseRateText, canonicalCardSlug, normalizeCardTypeName, sellSlug, calculateRateQuote, PayoutCurrency } from "@gc4s/shared";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, requireAdmin, hashPassword, generateReferralCode, randomToken, AuthedRequest } from "../lib/auth";
import { applyWalletChange } from "../services/wallet";
import { importRates } from "../services/rateImport";
import { payTrade } from "../services/payout";
import { payoutNgnToBank } from "../services/payoutProvider";
import { notify, notifyAdmins } from "../services/notify";
import { getRateConfig, listStaleCardTypeIds } from "../services/rateConfig";
import {
  executeNoOnesResell,
  isNoOnesConfigured,
  syncRatesFromNoOnes,
  syncCardRatesFromNoOnes,
  previewRateFromNoOnes,
  listNoOnesPaymentMethods,
  registerNoOnesWebhooks,
  reapplyCountryTierVisibility,
} from "../services/noones";
import {
  completeNoOnesSyncRun,
  failNoOnesSyncRun,
  getNoOnesSyncStatusResponse,
  isNoOnesSyncActive,
  tryStartNoOnesSyncRun,
} from "../services/noones/syncStatus";
import { publicUser, adminUserListItem } from "./auth";
import { serializeTrade, serializeMessage } from "./trades";
import { rejectTradeWithBadScore } from "../services/tradeRejection";
import { cancelTrade, canCancelTrade } from "../services/tradeCancel";
import { generateTradeNumber } from "../services/tradeNumber";
import { env } from "../env";
import { sendTransactionalEmail } from "../services/email";
import {
  ACTIVE_TRADE_STATUSES,
  applyUserModeration,
  countActiveTrades,
  countRecentRejections,
  getUserModerationSummary,
  getUserTradeLimit,
} from "../services/userModeration";
import { storedNairaFromRate, receiptTypeForQuote } from "../services/rateQuoteResolve";
import { parseStoredQuotes } from "../services/noones";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// ---------------------------------------------------------------- Stats
adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [users, pendingTrades, pendingWithdrawals, cardTypes] = await Promise.all([
      prisma.user.count(),
      prisma.trade.count({ where: { status: "PENDING" } }),
      prisma.withdrawal.count({ where: { status: "PENDING" } }),
      prisma.cardType.count(),
    ]);
    res.json({ users, pendingTrades, pendingWithdrawals, cardTypes });
  })
);

// ---------------------------------------------------------------- Users
adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const status = req.query.status as string | undefined;
    const users = await prisma.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status && status !== "ALL" ? { accountStatus: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const config = await getRateConfig();
    const activeCounts = await prisma.trade.groupBy({
      by: ["userId"],
      where: { status: { in: ACTIVE_TRADE_STATUSES } },
      _count: { _all: true },
    });
    const activeMap = new Map(activeCounts.map((r) => [r.userId, r._count._all]));
    res.json({
      users: users.map((u) =>
        adminUserListItem(u, {
          activeTrades: activeMap.get(u.id) ?? 0,
          recentRejections: 0,
          tradeLimit: u.maxConcurrentTrades ?? config.defaultMaxConcurrentTrades,
        })
      ),
    });
  })
);

adminRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().optional(),
        role: z.enum(["USER", "ADMIN"]).default("USER"),
      }),
      req.body
    );
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: "Email already exists" });
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: await hashPassword(data.password),
        displayName: data.displayName || data.email.split("@")[0],
        role: data.role,
        emailVerified: true,
        referralCode: generateReferralCode() + Date.now().toString(36).toUpperCase().slice(-3),
      },
    });
    res.status(201).json({ user: publicUser(user) });
  })
);

adminRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        displayName: z.string().optional(),
        role: z.enum(["USER", "ADMIN"]).optional(),
        trustLevel: z.number().int().min(0).max(10).optional(),
        emailVerified: z.boolean().optional(),
        maxConcurrentTrades: z.number().int().min(1).max(50).nullable().optional(),
        adminNotes: z.string().max(5000).nullable().optional(),
      }),
      req.body
    );
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ user: publicUser(user) });
  })
);

adminRouter.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const summary = await getUserModerationSummary(req.params.id);
    const tradeLimit = await getUserTradeLimit(req.params.id);
    res.json({
      user: adminUserListItem(summary.user, {
        activeTrades: summary.activeTrades,
        recentRejections: summary.recentRejections,
        tradeLimit,
      }),
      stats: {
        activeTrades: summary.activeTrades,
        tradeLimit,
        recentRejections: summary.recentRejections,
        totalTrades: summary.totalTrades,
        autoSuspendThreshold: summary.autoSuspendThreshold,
        autoSuspendWindowDays: summary.autoSuspendWindowDays,
      },
      events: summary.events.map((e) => ({
        id: e.id,
        action: e.action,
        reason: e.reason,
        suspendedUntil: e.suspendedUntil,
        createdAt: e.createdAt,
        admin: e.admin ? { id: e.admin.id, email: e.admin.email, displayName: e.admin.displayName } : null,
      })),
    });
  })
);

adminRouter.post(
  "/users/:id/moderate",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(
      z.object({
        action: z.enum(["ban", "suspend", "unsuspend", "lift_ban", "set_limits"]),
        reason: z.string().max(2000).optional(),
        suspendDays: z.number().int().min(1).max(365).optional(),
        maxConcurrentTrades: z.number().int().min(1).max(50).nullable().optional(),
        adminNotes: z.string().max(5000).nullable().optional(),
      }),
      req.body
    );
    await applyUserModeration(req.params.id, data.action, {
      adminId: req.userId,
      reason: data.reason,
      suspendDays: data.suspendDays,
      maxConcurrentTrades: data.maxConcurrentTrades,
      adminNotes: data.adminNotes,
    });
    const summary = await getUserModerationSummary(req.params.id);
    await notify({
      userId: summary.user.id,
      title:
        data.action === "ban"
          ? "Account banned"
          : data.action === "suspend"
            ? "Account suspended"
            : data.action === "lift_ban" || data.action === "unsuspend"
              ? "Account restriction lifted"
              : "Account limits updated",
      body: data.reason || "An administrator updated your account status. Contact support if you have questions.",
      link: "/dashboard",
      email: data.action === "ban" || data.action === "suspend",
    });
    res.json({ user: publicUser(summary.user) });
  })
);

adminRouter.post(
  "/users/:id/send-password-reset",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const resetToken = randomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const url = `${env.webUrl}/reset-password?token=${resetToken}`;
    await sendTransactionalEmail(user.email, "Reset your password", {
      title: "Reset your password",
      paragraphs: [
        "An administrator requested a password reset for your GiftCard4Sale account.",
        "This link expires in 1 hour. If you did not expect this, contact support immediately.",
      ],
      ctaLabel: "Reset password",
      ctaHref: url,
      securityNote: "Never share this link with anyone.",
    });
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/users/:id/reset-password",
  asyncHandler(async (req, res) => {
    const { password } = validate(z.object({ password: z.string().min(8) }), req.body);
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        resetToken: null,
        resetTokenExp: null,
        passwordChangedAt: new Date(),
      },
    });
    await sendTransactionalEmail(user.email, "Your password was changed", {
      title: "Password changed",
      paragraphs: [
        "Your GiftCard4Sale password was updated by an administrator.",
        "If you did not request this change, contact support immediately.",
      ],
      ctaLabel: "Sign in",
      ctaHref: `${env.webUrl}/login`,
      securityNote: "GiftCard4Sale will never ask for your password by email or chat.",
    });
    res.json({ ok: true });
  })
);

// Mark a good (+green) or bad (+red) transaction score.
adminRouter.post(
  "/users/:id/score",
  asyncHandler(async (req, res) => {
    const { kind, delta } = validate(
      z.object({ kind: z.enum(["good", "bad"]), delta: z.number().int().default(1) }),
      req.body
    );
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: kind === "good" ? { goodScore: { increment: delta } } : { badScore: { increment: delta } },
    });
    await notify({
      userId: user.id,
      title: kind === "good" ? "Good transaction recorded" : "Bad transaction recorded",
      body:
        kind === "good"
          ? "An admin marked a transaction as good. Thank you for trading honestly!"
          : "An admin marked a transaction as bad. Please avoid submitting used/invalid cards.",
      link: "/dashboard",
      email: kind === "bad",
    });
    res.json({ user: publicUser(user) });
  })
);

adminRouter.post(
  "/users/:id/adjust-balance",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        currency: z.enum(["USDT", "NGN", "GHS"]),
        amount: z.number(), // can be negative
        description: z.string().optional(),
      }),
      req.body
    );
    await prisma.$transaction(async (tx) => {
      await applyWalletChange(tx, req.params.id, data.currency, new Prisma.Decimal(data.amount), "ADMIN_ADJUSTMENT", {
        description: data.description || "Admin balance adjustment",
      });
    });
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (user) {
      const sign = data.amount >= 0 ? "+" : "";
      await notify({
        userId: user.id,
        title: "Wallet balance adjusted",
        body: `An administrator adjusted your ${data.currency} balance by ${sign}${data.amount}.`,
        link: "/dashboard/wallet",
        emailDetail: data.description || undefined,
      });
    }
    res.json({ user: publicUser(user) });
  })
);

adminRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------- Trades
adminRouter.get(
  "/trades",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const trades = await prisma.trade.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { cardType: true, attachments: true, user: true },
    });
    res.json({
      trades: trades.map((t) => ({
        ...serializeTrade(t),
        user: { id: t.user.id, displayName: t.user.displayName, email: t.user.email },
      })),
    });
  })
);

adminRouter.get(
  "/trades/:id",
  asyncHandler(async (req, res) => {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id },
      include: {
        cardType: true,
        attachments: true,
        user: true,
        messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
      },
    });
    if (!trade) return res.status(404).json({ error: "Not found" });
    res.json({
      trade: {
        ...serializeTrade(trade),
        user: publicUser(trade.user),
        noonesTradeHash: trade.noonesTradeHash,
        noonesOfferHash: trade.noonesOfferHash,
        noonesStatus: trade.noonesStatus,
        noonesError: trade.noonesError,
        noonesCryptoAmount: trade.noonesCryptoAmount != null ? Number(trade.noonesCryptoAmount) : null,
        noonesCryptoCurrency: trade.noonesCryptoCurrency,
      },
      messages: trade.messages.map((m) => serializeMessage(m)),
    });
  })
);

// Update trade status / final payout. Marking PAID triggers wallet credit + referral bonus.
adminRouter.patch(
  "/trades/:id",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        status: z.enum(["PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"]).optional(),
        finalPayout: z.number().optional(),
        rejectionReason: z.string().optional(),
      }),
      req.body
    );

    const trade = await prisma.trade.findUnique({ where: { id: req.params.id } });
    if (!trade) return res.status(404).json({ error: "Not found" });

    const patch: Prisma.TradeUpdateInput = {};
    if (data.finalPayout != null) patch.finalPayout = new Prisma.Decimal(data.finalPayout);

    if (data.status === "CANCELLED" && trade.status !== "CANCELLED") {
      const check = canCancelTrade(trade, true);
      if (!check.ok) return res.status(400).json({ error: check.error });
      await cancelTrade(trade.id, { byAdmin: true, reason: data.rejectionReason });
    } else if (data.status === "REJECTED" && trade.status !== "REJECTED") {
      await rejectTradeWithBadScore(trade.id, {
        rejectionReason: data.rejectionReason ?? trade.rejectionReason ?? undefined,
      });
    } else {
      if (data.rejectionReason != null) patch.rejectionReason = data.rejectionReason;
      if (data.status && data.status !== "PAID" && data.status !== "CANCELLED") patch.status = data.status;
    }

    if (data.status === "PAID") {
      await payTrade(trade.id);
    } else if (Object.keys(patch).length > 0) {
      await prisma.trade.update({ where: { id: trade.id }, data: patch });
    }

    if (data.status === "REJECTED" && trade.status !== "REJECTED") {
      await notify({
        userId: trade.userId,
        title: "Trade rejected",
        body: data.rejectionReason || "Your trade was rejected. Please contact support for details.",
        link: `/dashboard/trades/${trade.id}`,
        emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
      });
    } else if (data.status === "CANCELLED" && trade.status !== "CANCELLED") {
      await notify({
        userId: trade.userId,
        title: "Trade cancelled",
        body: data.rejectionReason || "Your trade was cancelled.",
        link: `/dashboard/trades/${trade.id}`,
        emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
      });
    } else if (data.status === "INFO_REQUESTED") {
      await notify({
        userId: trade.userId,
        title: "More info needed for your trade",
        body: "An admin needs more information. Please open the trade chat to respond.",
        link: `/dashboard/trades/${trade.id}`,
        emailSubject: "Action required on your trade",
        emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
      });
    } else if (data.status && data.status !== "PROCESSING" && data.status !== "PENDING") {
      await notify({
        userId: trade.userId,
        title: `Trade ${data.status.toLowerCase().replace("_", " ")}`,
        body: `Your trade status is now ${data.status.replace("_", " ")}.`,
        link: `/dashboard/trades/${trade.id}`,
        email: data.status === "APPROVED",
        emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
      });
    }

    const updated = await prisma.trade.findUnique({
      where: { id: trade.id },
      include: { cardType: true, attachments: true },
    });
    res.json({ trade: serializeTrade(updated) });
  })
);

// Admin creates a trade on behalf of a user (optional custom rates).
adminRouter.post(
  "/trades",
  asyncHandler(async (req, res) => {
    const data = validate(
      z
        .object({
          userId: z.string(),
          rateId: z.string().optional(),
          cardTypeId: z.string().optional(),
          country: z.string().optional(),
          currency: z.string().optional(),
          medium: z.enum(["PHYSICAL", "ECODE"]).optional(),
          receiptType: z.enum(["NONE", "CASH", "DEBIT"]).default("NONE"),
          cardAmount: z.number().positive(),
          payoutCurrency: z.enum(["USDT", "NGN", "GHS"]),
          nairaPerUnit: z.number().positive().optional(),
          effectiveRate: z.number().positive().optional(),
          quotedPayout: z.number().positive().optional(),
          finalPayout: z.number().positive().optional(),
          markPaid: z.boolean().default(false),
          startNoOnes: z.boolean().default(false),
          status: z.enum(["PENDING", "PROCESSING"]).default("PENDING"),
          notes: z.string().optional(),
          ecodes: z.string().optional(),
          cardDenominations: z.string().optional(),
          otherCountryName: z.string().optional(),
        })
        .refine((d) => d.rateId || (d.cardTypeId && d.country && d.currency && d.medium), {
          message: "Provide rateId or cardTypeId + country + currency + medium",
        }),
      req.body
    );

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let cardTypeId = data.cardTypeId!;
    let country = data.country!;
    let currency = data.currency!;
    let medium = data.medium!;
    let rateRow: { nairaPerUnit: any; storedQuotes: unknown; cardTypeId: string; country: string; currency: string; medium: string } | null = null;

    if (data.rateId) {
      const rate = await prisma.rate.findUnique({
        where: { id: data.rateId },
        include: { cardType: true },
      });
      if (!rate) return res.status(404).json({ error: "Rate not found" });
      cardTypeId = rate.cardTypeId;
      country = rate.country;
      currency = rate.currency;
      medium = rate.medium;
      rateRow = rate;
    }

    const config = await getRateConfig();
    const receiptType = receiptTypeForQuote({
      receiptType: data.receiptType,
      preferNoReceipt: data.receiptType === "NONE",
    });

    let nairaPerUnit = data.nairaPerUnit;
    if (nairaPerUnit == null && rateRow) {
      const ecodeSibling =
        rateRow.medium === "PHYSICAL"
          ? await prisma.rate.findFirst({
              where: {
                cardTypeId: rateRow.cardTypeId,
                country: rateRow.country,
                medium: "ECODE",
                minDenom: (rateRow as any).minDenom ?? null,
                maxDenom: (rateRow as any).maxDenom ?? null,
                active: true,
              },
            })
          : null;
      nairaPerUnit = storedNairaFromRate(rateRow as any, receiptType, {
        ecodeRate: ecodeSibling
          ? { nairaPerUnit: Number(ecodeSibling.nairaPerUnit), storedQuotes: ecodeSibling.storedQuotes }
          : null,
      });
    }
    if (nairaPerUnit == null) {
      return res.status(400).json({ error: "nairaPerUnit is required when rateId is not provided" });
    }

    const quote = calculateRateQuote({
      nairaPerUnit,
      cardAmount: data.cardAmount,
      payoutCurrency: data.payoutCurrency as PayoutCurrency,
      medium: medium as "PHYSICAL" | "ECODE",
      rates: config.rates,
      reductions: config.reductions,
    });

    const quotedPayout = data.quotedPayout ?? data.finalPayout ?? quote.payoutAmount;
    const effectiveRate = data.effectiveRate ?? quote.effectiveNairaPerUnit;
    const tradeNumber = await generateTradeNumber();

    const trade = await prisma.trade.create({
      data: {
        tradeNumber,
        userId: data.userId,
        cardTypeId,
        country,
        currency,
        medium: medium as any,
        receiptType: data.receiptType,
        cardAmount: new Prisma.Decimal(data.cardAmount),
        cardDenominations: data.cardDenominations?.trim() || null,
        otherCountryName: data.otherCountryName?.trim() || null,
        payoutCurrency: data.payoutCurrency,
        nairaPerUnit: new Prisma.Decimal(nairaPerUnit),
        effectiveRate: new Prisma.Decimal(effectiveRate),
        quotedPayout: new Prisma.Decimal(quotedPayout),
        finalPayout: data.finalPayout != null ? new Prisma.Decimal(data.finalPayout) : null,
        ecodes: data.ecodes,
        notes: data.notes ? `[Admin] ${data.notes}` : "[Admin] Trade opened on behalf of user",
        status: data.markPaid ? "APPROVED" : data.status,
      },
    });

    if (data.markPaid) await payTrade(trade.id);
    else if (data.startNoOnes && isNoOnesConfigured()) {
      executeNoOnesResell(trade.id).catch((err) =>
        console.error(`NoOnes resell background error (${trade.id}):`, err.message)
      );
    }

    await notify({
      userId: data.userId,
      title: "Trade opened on your account",
      body: `An administrator opened trade ${tradeNumber} on your behalf.`,
      link: `/dashboard/trades/${trade.id}`,
      emailDetail: `Trade ID: ${tradeNumber}`,
    });

    const out = await prisma.trade.findUnique({
      where: { id: trade.id },
      include: { cardType: true, attachments: true },
    });
    res.status(201).json({ trade: serializeTrade(out) });
  })
);

// ---------------------------------------------------------------- Withdrawals
adminRouter.get(
  "/withdrawals",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const withdrawals = await prisma.withdrawal.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: true, bankAccount: true, momoAccount: true },
    });
    res.json({
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        currency: w.currency,
        amount: Number(w.amount),
        status: w.status,
        destinationAddress: w.destinationAddress,
        bankAccount: w.bankAccount,
        momoAccount: w.momoAccount,
        adminNote: w.adminNote,
        createdAt: w.createdAt,
        user: { id: w.user.id, displayName: w.user.displayName, email: w.user.email },
      })),
    });
  })
);

adminRouter.patch(
  "/withdrawals/:id",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        status: z.enum(["PENDING", "PROCESSING", "APPROVED", "REJECTED", "PAID"]),
        adminNote: z.string().optional(),
      }),
      req.body
    );
    const withdrawal = await prisma.withdrawal.findUnique({ where: { id: req.params.id } });
    if (!withdrawal) return res.status(404).json({ error: "Not found" });

    if (withdrawal.status === "REJECTED" || withdrawal.status === "PAID") {
      return res.status(400).json({ error: "Withdrawal already finalized" });
    }

    if (data.status === "REJECTED") {
      // Refund the held funds.
      await prisma.$transaction(async (tx) => {
        await applyWalletChange(tx, withdrawal.userId, withdrawal.currency, withdrawal.amount, "TRANSFER_CREDIT", {
          withdrawalId: withdrawal.id,
          description: `Refund for rejected withdrawal ${withdrawal.id}`,
        });
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: "REJECTED", adminNote: data.adminNote },
        });
      });
      await notify({
        userId: withdrawal.userId,
        title: "Withdrawal rejected & refunded",
        body: `Your withdrawal of ${Number(withdrawal.amount)} ${withdrawal.currency} was rejected and refunded. ${data.adminNote ?? ""}`,
        link: "/dashboard/wallet",
      });
    } else if (data.status === "PAID") {
      let note = data.adminNote;

      // Try an automated bank transfer for Naira when a provider is configured.
      if (withdrawal.currency === "NGN" && withdrawal.bankAccountId) {
        const bank = await prisma.bankAccount.findUnique({ where: { id: withdrawal.bankAccountId } });
        if (bank) {
          const result = await payoutNgnToBank({
            amount: Number(withdrawal.amount),
            accountNumber: bank.accountNumber,
            accountName: bank.accountName,
            bankName: bank.bankName,
            reason: `GiftCard4Sale withdrawal ${withdrawal.id}`,
          });
          if (result.ok) {
            note = `${note ? note + " | " : ""}Auto-paid (ref ${result.reference})`;
          } else if (!result.manual) {
            // Provider configured but the transfer failed -> do not mark paid.
            return res.status(400).json({ error: `Payout failed: ${result.message}` });
          }
          // result.manual === true => no provider; fall through to manual mark-paid.
        }
      }

      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "PAID", adminNote: note },
      });
      await notify({
        userId: withdrawal.userId,
        title: "Withdrawal paid",
        body: `Your withdrawal of ${Number(withdrawal.amount)} ${withdrawal.currency} has been paid.`,
        link: "/dashboard/wallet",
      });
    } else {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: data.status, adminNote: data.adminNote },
      });
    }

    const updated = await prisma.withdrawal.findUnique({ where: { id: withdrawal.id } });
    res.json({ withdrawal: { id: updated!.id, status: updated!.status } });
  })
);

// ---------------------------------------------------------------- Rates & cards
adminRouter.post(
  "/rates/parse",
  asyncHandler(async (req, res) => {
    const { text } = validate(z.object({ text: z.string().min(1) }), req.body);
    const result = parseRateText(text);
    res.json(result);
  })
);

adminRouter.post(
  "/rates/import",
  asyncHandler(async (req, res) => {
    const { text, replaceExisting } = validate(
      z.object({ text: z.string().min(1), replaceExisting: z.boolean().default(false) }),
      req.body
    );
    const { entries, warnings } = parseRateText(text);
    const summary = await importRates(entries, replaceExisting);
    res.json({ summary, warnings, parsed: entries.length });
  })
);

adminRouter.get(
  "/cards",
  asyncHandler(async (_req, res) => {
    const cards = await prisma.cardType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { rates: true } } },
    });
    res.json({
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sellSlug: c.sellSlug,
        active: c.active,
        imageUrl: c.imageUrl,
        description: c.description,
        rateCount: c._count.rates,
        noonesPaymentMethod: c.noonesPaymentMethod,
      })),
    });
  })
);

adminRouter.post(
  "/cards",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({ name: z.string().min(1), description: z.string().optional(), imageUrl: z.string().optional() }),
      req.body
    );
    const name = normalizeCardTypeName(data.name);
    const slug = canonicalCardSlug(name);
    const card = await prisma.cardType.create({
      data: { name, slug, sellSlug: sellSlug(name), description: data.description, imageUrl: data.imageUrl },
    });
    res.status(201).json({ card });
  })
);

adminRouter.patch(
  "/cards/:id",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        active: z.boolean().optional(),
      }),
      req.body
    );
    const patch: any = { ...data };
    if (data.name) {
      const name = normalizeCardTypeName(data.name);
      patch.name = name;
      patch.slug = canonicalCardSlug(name);
      patch.sellSlug = sellSlug(name);
    }
    const card = await prisma.cardType.update({ where: { id: req.params.id }, data: patch });
    res.json({ card });
  })
);

adminRouter.delete(
  "/cards/:id",
  asyncHandler(async (req, res) => {
    const card = await prisma.cardType.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { trades: true } } },
    });
    if (!card) return res.status(404).json({ error: "Card not found" });
    if (card._count.trades > 0) {
      return res.status(400).json({
        error: `Cannot delete "${card.name}" — ${card._count.trades} trade(s) use this card. Deactivate it instead.`,
      });
    }
    await prisma.landingPage.updateMany({
      where: { cardTypeId: card.id },
      data: { cardTypeId: null },
    });
    await prisma.cardType.delete({ where: { id: card.id } });
    res.json({ ok: true });
  })
);

adminRouter.get(
  "/cards/:id/rates",
  asyncHandler(async (req, res) => {
    const rates = await prisma.rate.findMany({
      where: { cardTypeId: req.params.id },
      orderBy: [{ country: "asc" }, { minDenom: "asc" }],
    });
    res.json({ rates: rates.map((r) => ({ ...r, nairaPerUnit: Number(r.nairaPerUnit) })) });
  })
);

adminRouter.post(
  "/cards/:id/rates",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        country: z.string(),
        currency: z.string(),
        minDenom: z.number().int().nullable().optional(),
        maxDenom: z.number().int().nullable().optional(),
        medium: z.enum(["PHYSICAL", "ECODE"]),
        nairaPerUnit: z.number().positive(),
      }),
      req.body
    );
    const rate = await prisma.rate.create({
      data: {
        cardTypeId: req.params.id,
        country: data.country,
        currency: data.currency,
        minDenom: data.minDenom ?? null,
        maxDenom: data.maxDenom ?? null,
        medium: data.medium,
        nairaPerUnit: new Prisma.Decimal(data.nairaPerUnit),
      },
    });
    res.status(201).json({ rate: { ...rate, nairaPerUnit: Number(rate.nairaPerUnit) } });
  })
);

adminRouter.patch(
  "/rates/:id",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        nairaPerUnit: z.number().positive().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
        minDenom: z.number().int().nullable().optional(),
        maxDenom: z.number().int().nullable().optional(),
        medium: z.enum(["PHYSICAL", "ECODE"]).optional(),
        active: z.boolean().optional(),
      }),
      req.body
    );
    const patch: any = { ...data };
    if (data.nairaPerUnit != null) patch.nairaPerUnit = new Prisma.Decimal(data.nairaPerUnit);
    const rate = await prisma.rate.update({ where: { id: req.params.id }, data: patch });
    res.json({ rate: { ...rate, nairaPerUnit: Number(rate.nairaPerUnit) } });
  })
);

adminRouter.delete(
  "/rates/:id",
  asyncHandler(async (req, res) => {
    await prisma.rate.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------- Config
adminRouter.get(
  "/config",
  asyncHandler(async (_req, res) => {
    const config = await getRateConfig();
    res.json({ config });
  })
);

adminRouter.put(
  "/config",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        ngnPerUsdt: z.number().positive(),
        ngnPerGhs: z.number().positive(),
        nairaReductionPercent: z.number().int().min(0).max(100),
        usdtReductionPercent: z.number().int().min(0).max(100),
        ghsReductionPercent: z.number().int().min(0).max(100),
        referralPercent: z.number().int().min(0).max(100),
        noonesRateRefreshHours: z.number().int().min(1).max(168),
        noonesTopOffersForRate: z.number().int().min(1).max(50),
        minCountryOffersForDisplay: z.number().int().min(1).max(100),
        defaultMaxConcurrentTrades: z.number().int().min(1).max(50),
        autoSuspendRejectThreshold: z.number().int().min(0).max(100),
        autoSuspendRejectWindowDays: z.number().int().min(1).max(365),
        autoSuspendDurationDays: z.number().int().min(1).max(365),
        minWithdrawalNgn: z.number().positive(),
        minWithdrawalGhs: z.number().positive(),
        minWithdrawalUsdt: z.number().positive(),
      }),
      req.body
    );
    await prisma.rateConfig.create({
      data: {
        ngnPerUsdt: new Prisma.Decimal(data.ngnPerUsdt),
        ngnPerGhs: new Prisma.Decimal(data.ngnPerGhs),
        nairaReductionPercent: data.nairaReductionPercent,
        usdtReductionPercent: data.usdtReductionPercent,
        ghsReductionPercent: data.ghsReductionPercent,
        referralPercent: data.referralPercent,
        noonesRateRefreshHours: data.noonesRateRefreshHours,
        noonesTopOffersForRate: data.noonesTopOffersForRate,
        minCountryOffersForDisplay: data.minCountryOffersForDisplay,
        defaultMaxConcurrentTrades: data.defaultMaxConcurrentTrades,
        autoSuspendRejectThreshold: data.autoSuspendRejectThreshold,
        autoSuspendRejectWindowDays: data.autoSuspendRejectWindowDays,
        autoSuspendDurationDays: data.autoSuspendDurationDays,
        minWithdrawalNgn: new Prisma.Decimal(data.minWithdrawalNgn),
        minWithdrawalGhs: new Prisma.Decimal(data.minWithdrawalGhs),
        minWithdrawalUsdt: new Prisma.Decimal(data.minWithdrawalUsdt),
      },
    });
    const tiersUpdated = await reapplyCountryTierVisibility(data.minCountryOffersForDisplay);
    const config = await getRateConfig();
    res.json({ config, tiersUpdated });
  })
);

// ---------------------------------------------------------------- Landing pages
adminRouter.get(
  "/landing",
  asyncHandler(async (_req, res) => {
    const pages = await prisma.landingPage.findMany({ orderBy: { updatedAt: "desc" } });
    res.json({ pages });
  })
);

const landingSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  bodyHtml: z.string().min(1),
  sourceUrl: z.string().optional(),
  cardTypeId: z.string().optional(),
  published: z.boolean().default(true),
});

adminRouter.post(
  "/landing",
  asyncHandler(async (req, res) => {
    const data = validate(landingSchema, req.body);
    const page = await prisma.landingPage.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        metaTitle: data.metaTitle,
        metaDesc: data.metaDesc,
        bodyHtml: data.bodyHtml,
        sourceUrl: data.sourceUrl,
        cardTypeId: data.cardTypeId,
        published: data.published,
      },
      create: data,
    });
    res.json({ page });
  })
);

adminRouter.post(
  "/landing/import",
  asyncHandler(async (req, res) => {
    const { pages } = validate(z.object({ pages: z.array(landingSchema) }), req.body);
    let count = 0;
    for (const data of pages) {
      await prisma.landingPage.upsert({
        where: { slug: data.slug },
        update: { ...data },
        create: { ...data },
      });
      count++;
    }
    res.json({ imported: count });
  })
);

adminRouter.delete(
  "/landing/:slug",
  asyncHandler(async (req, res) => {
    await prisma.landingPage.delete({ where: { slug: req.params.slug } });
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------- Referrals overview
adminRouter.get(
  "/referrals",
  asyncHandler(async (_req, res) => {
    const topReferrers = await prisma.user.findMany({
      where: { referrals: { some: {} } },
      orderBy: { referrals: { _count: "desc" } },
      take: 50,
      select: {
        id: true,
        displayName: true,
        email: true,
        referralCode: true,
        _count: { select: { referrals: true, referralEarnings: true } },
      },
    });
    res.json({ topReferrers });
  })
);

// ---------------------------------------------------------------- NoOnes integration
adminRouter.get(
  "/noones/status",
  asyncHandler(async (_req, res) => {
    res.json({
      configured: isNoOnesConfigured(),
      webhookUrl: process.env.NOONES_WEBHOOK_URL || `${process.env.API_URL || ""}/webhooks/noones`,
    });
  })
);

adminRouter.get(
  "/noones/sync-status",
  asyncHandler(async (req, res) => {
    const light = req.query.light === "1" || req.query.light === "true";
    res.json(await getNoOnesSyncStatusResponse(isNoOnesConfigured(), { skipDb: light }));
  })
);

adminRouter.post(
  "/noones/sync-rates",
  asyncHandler(async (req, res) => {
    if (!isNoOnesConfigured()) return res.status(400).json({ error: "NoOnes is not configured" });
    if (isNoOnesSyncActive()) {
      return res.status(409).json({
        error: "A NoOnes sync is already in progress",
        status: await getNoOnesSyncStatusResponse(true),
      });
    }

    const force = Boolean(req.body?.force);
    tryStartNoOnesSyncRun({ scope: "full", force, trigger: "admin" });

    void (async () => {
      try {
        let syncOptions: { force: boolean; cardTypeIds?: string[] } = { force };
        if (!force) {
          const config = await getRateConfig();
          const staleCards = await listStaleCardTypeIds(config.noonesRateRefreshHours);
          if (!staleCards.length) {
            completeNoOnesSyncRun({
              created: 0,
              updated: 0,
              skipped: 0,
              drafted: 0,
              published: 0,
              cardTypes: 0,
              errors: [],
            });
            return;
          }
          syncOptions = { force: false, cardTypeIds: staleCards.map((c) => c.id) };
        }
        const summary = await syncRatesFromNoOnes(syncOptions);
        completeNoOnesSyncRun(summary);
      } catch (err) {
        failNoOnesSyncRun((err as Error).message);
      }
    })();

    res.status(202).json({
      started: true,
      status: await getNoOnesSyncStatusResponse(true),
    });
  })
);

adminRouter.post(
  "/card-types/:id/sync-rates",
  asyncHandler(async (req, res) => {
    if (!isNoOnesConfigured()) return res.status(400).json({ error: "NoOnes is not configured" });
    const card = await prisma.cardType.findUnique({ where: { id: req.params.id } });
    if (!card) return res.status(404).json({ error: "Card not found" });
    if (!card.noonesPaymentMethod) {
      return res.status(400).json({ error: "This card has no NoOnes payment method mapped" });
    }
    if (isNoOnesSyncActive()) {
      return res.status(409).json({
        error: "A NoOnes sync is already in progress",
        status: await getNoOnesSyncStatusResponse(true),
      });
    }

    tryStartNoOnesSyncRun({
      scope: "card",
      force: true,
      trigger: "admin",
      cardTypeId: card.id,
      cardName: card.name,
      totalCards: 1,
    });

    void syncCardRatesFromNoOnes(card.id, { force: true })
      .then((summary) => completeNoOnesSyncRun(summary))
      .catch((err) => failNoOnesSyncRun((err as Error).message));

    res.status(202).json({
      started: true,
      status: await getNoOnesSyncStatusResponse(true),
    });
  })
);

adminRouter.get(
  "/noones/payment-methods",
  asyncHandler(async (_req, res) => {
    if (!isNoOnesConfigured()) return res.status(400).json({ error: "NoOnes is not configured" });
    const methods = await listNoOnesPaymentMethods();
    res.json({ methods });
  })
);

adminRouter.get(
  "/noones/preview-rate/:rateId",
  asyncHandler(async (req, res) => {
    if (!isNoOnesConfigured()) return res.status(400).json({ error: "NoOnes is not configured" });
    const preview = await previewRateFromNoOnes(req.params.rateId);
    res.json({ preview });
  })
);

adminRouter.post(
  "/noones/register-webhooks",
  asyncHandler(async (_req, res) => {
    if (!isNoOnesConfigured()) return res.status(400).json({ error: "NoOnes is not configured" });
    await registerNoOnesWebhooks();
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/trades/:id/retry-noones",
  asyncHandler(async (req, res) => {
    if (!isNoOnesConfigured()) return res.status(400).json({ error: "NoOnes is not configured" });
    const trade = await prisma.trade.findUnique({ where: { id: req.params.id } });
    if (!trade) return res.status(404).json({ error: "Not found" });
    if (trade.noonesTradeHash) {
      return res.status(400).json({ error: "Trade already submitted to NoOnes" });
    }
    await prisma.trade.update({
      where: { id: trade.id },
      data: { noonesError: null, noonesStatus: null },
    });
    await executeNoOnesResell(trade.id);
    const updated = await prisma.trade.findUnique({
      where: { id: trade.id },
      include: { cardType: true, attachments: true },
    });
    res.json({ trade: serializeTrade(updated) });
  })
);

adminRouter.patch(
  "/card-types/:id/noones-method",
  asyncHandler(async (req, res) => {
    const { noonesPaymentMethod } = validate(
      z.object({ noonesPaymentMethod: z.string().min(1).nullable() }),
      req.body
    );
    const card = await prisma.cardType.update({
      where: { id: req.params.id },
      data: { noonesPaymentMethod },
    });
    res.json({ card: { id: card.id, noonesPaymentMethod: card.noonesPaymentMethod } });
  })
);
