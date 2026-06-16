import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { getRateConfig } from "../services/rateConfig";
import { env } from "../env";

export const referralsRouter = Router();

referralsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const referrals = await prisma.user.findMany({
      where: { referredById: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, displayName: true, email: true, createdAt: true },
    });

    const earnings = await prisma.referralEarning.findMany({
      where: { earnerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const totals: Record<string, number> = { USDT: 0, NGN: 0, GHS: 0 };
    for (const e of earnings) totals[e.currency] += Number(e.amount);

    const config = await getRateConfig();

    res.json({
      referralCode: user.referralCode,
      referralLink: `${env.webUrl}/register?ref=${user.referralCode}`,
      referralPercent: config.referralPercent,
      totalReferrals: referrals.length,
      // mask emails a little for privacy
      referrals: referrals.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        joinedAt: r.createdAt,
      })),
      totals,
      earnings: earnings.map((e) => ({
        id: e.id,
        currency: e.currency,
        amount: Number(e.amount),
        description: e.description,
        createdAt: e.createdAt,
      })),
    });
  })
);
