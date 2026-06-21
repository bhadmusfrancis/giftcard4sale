import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { upload, fileUrl } from "../lib/upload";
import { publicUser } from "./auth";
import {
  parseNotificationPreferences,
  NOTIFICATION_CATEGORIES,
} from "../services/notificationPreferences";

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
    const url = fileUrl(file);
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
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ accounts });
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
    const account = await prisma.bankAccount.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json({ account });
  })
);

meRouter.delete(
  "/bank-accounts/:id",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const account = await prisma.bankAccount.findUnique({ where: { id: req.params.id } });
    if (!account || account.userId !== req.userId) return res.status(404).json({ error: "Not found" });
    await prisma.bankAccount.delete({ where: { id: account.id } });
    res.json({ ok: true });
  })
);

// ---- MoMo accounts (for Cedi withdrawals) ----
const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

meRouter.get(
  "/momo-accounts",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const accounts = await prisma.momoAccount.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ accounts });
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
    const account = await prisma.momoAccount.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json({ account });
  })
);

meRouter.delete(
  "/momo-accounts/:id",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const account = await prisma.momoAccount.findUnique({ where: { id: req.params.id } });
    if (!account || account.userId !== req.userId) return res.status(404).json({ error: "Not found" });
    await prisma.momoAccount.delete({ where: { id: account.id } });
    res.json({ ok: true });
  })
);
