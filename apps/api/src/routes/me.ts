import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { upload, fileRef } from "../lib/upload";
import { publicUser } from "./auth";
import {
  parseNotificationPreferences,
  NOTIFICATION_CATEGORIES,
} from "../services/notificationPreferences";
import { getRateConfig } from "../services/rateConfig";

export const meRouter = Router();

const channelPrefsSchema = z.object({
  inApp: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
});

const preferencesPatchSchema = z.object({
  tradeStatus: channelPrefsSchema.partial().optional(),
  tradeChat: channelPrefsSchema.partial().optional(),
  withdrawal: channelPrefsSchema.partial().optional(),
  referral: channelPrefsSchema.partial().optional(),
});

meRouter.get(
  "/notification-preferences",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { notificationPreferences: true },
    });
    res.json({ preferences: parseNotificationPreferences(user?.notificationPreferences) });
  })
);

meRouter.patch(
  "/notification-preferences",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const patch = validate(preferencesPatchSchema, req.body);

    const current = parseNotificationPreferences(
      (
        await prisma.user.findUnique({
          where: { id: req.userId },
          select: { notificationPreferences: true },
        })
      )?.notificationPreferences
    );

    const next = { ...current };
    for (const category of NOTIFICATION_CATEGORIES) {
      const update = patch[category];
      if (update) next[category] = { ...current[category], ...update };
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { notificationPreferences: next as unknown as Prisma.InputJsonValue },
    });
    res.json({ preferences: parseNotificationPreferences(user.notificationPreferences) });
  })
);

meRouter.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(
      z.object({ displayName: z.string().min(2).max(40).optional() }),
      req.body
    );
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { displayName: data.displayName },
    });
    res.json({ user: publicUser(user) });
  })
);

meRouter.post(
  "/avatar",
  requireAuth,
  upload.single("avatar"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: "No image uploaded" });
    const url = fileRef(file);
    const user = await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl: url } });
    res.json({ user: publicUser(user) });
  })
);

meRouter.get(
  "/transactions",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const txns = await prisma.walletTransaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({
      transactions: txns.map((t) => ({
        id: t.id,
        type: t.type,
        currency: t.currency,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  })
);

// ---- Bank accounts (for Naira withdrawals) ----
meRouter.get(
  "/bank-accounts",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [accounts, config] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
      }),
      getRateConfig(),
    ]);
    res.json({ accounts, limit: config.maxBankAccounts });
  })
);

meRouter.post(
  "/bank-accounts",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(
      z.object({
        bankName: z.string().min(2),
        accountNumber: z.string().min(6).max(20),
        accountName: z.string().min(2),
      }),
      req.body
    );
    const [count, config] = await Promise.all([
      prisma.bankAccount.count({ where: { userId: req.userId } }),
      getRateConfig(),
    ]);
    if (count >= config.maxBankAccounts) {
      return res.status(400).json({ error: `You can save up to ${config.maxBankAccounts} bank accounts.` });
    }
    const account = await prisma.bankAccount.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json({ account });
  })
);

// Saved payout accounts are permanent for users — only admins can remove them.
meRouter.delete(
  "/bank-accounts/:id",
  requireAuth,
  asyncHandler(async (_req: AuthedRequest, res) => {
    res.status(403).json({ error: "Saved bank accounts can't be removed. Contact support if you need help." });
  })
);

// ---- MoMo accounts (for Cedi withdrawals) ----
const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

meRouter.get(
  "/momo-accounts",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [accounts, config] = await Promise.all([
      prisma.momoAccount.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
      }),
      getRateConfig(),
    ]);
    res.json({ accounts, limit: config.maxMomoAccounts });
  })
);

meRouter.post(
  "/momo-accounts",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(
      z.object({
        network: z.enum(MOMO_NETWORKS),
        phoneNumber: z.string().min(9).max(15),
        accountName: z.string().min(2),
      }),
      req.body
    );
    const [count, config] = await Promise.all([
      prisma.momoAccount.count({ where: { userId: req.userId } }),
      getRateConfig(),
    ]);
    if (count >= config.maxMomoAccounts) {
      return res.status(400).json({ error: `You can save up to ${config.maxMomoAccounts} MoMo accounts.` });
    }
    const account = await prisma.momoAccount.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json({ account });
  })
);

meRouter.delete(
  "/momo-accounts/:id",
  requireAuth,
  asyncHandler(async (_req: AuthedRequest, res) => {
    res.status(403).json({ error: "Saved MoMo accounts can't be removed. Contact support if you need help." });
  })
);
