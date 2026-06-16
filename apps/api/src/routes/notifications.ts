import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { env } from "../env";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, AuthedRequest } from "../lib/auth";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/vapid-public-key",
  asyncHandler(async (_req, res) => {
    res.json({ key: env.vapid.publicKey });
  })
);

notificationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unread = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unread });
  })
);

notificationsRouter.post(
  "/read",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { ids } = validate(z.object({ ids: z.array(z.string()).optional() }), req.body);
    await prisma.notification.updateMany({
      where: { userId: req.userId, ...(ids ? { id: { in: ids } } : {}) },
      data: { read: true },
    });
    res.json({ ok: true });
  })
);

notificationsRouter.post(
  "/subscribe",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sub = validate(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
      }),
      req.body
    );
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { userId: req.userId!, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { userId: req.userId!, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    res.json({ ok: true });
  })
);
