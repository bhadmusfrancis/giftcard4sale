import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { applyWalletChange } from "./wallet";
import { getRateConfig } from "./rateConfig";
import { notify } from "./notify";
import { trackTradePurchaseConversion } from "./tradeConversions";

/**
 * Credit a trade's payout to the seller's wallet and pay the referral bonus.
 * Idempotent: if a TRADE_CREDIT already exists for this trade, it does nothing.
 */
export async function payTrade(tradeId: string): Promise<void> {
  const config = await getRateConfig();

  const result = await prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new Error("Trade not found");
    if (trade.status === "CANCELLED" || trade.status === "REJECTED") return { alreadyPaid: true, trade };
    const statusBeforePay = trade.status;

    // A trade earns one good transaction score the first time it reaches PAID,
    // regardless of which path (fresh credit or self-heal) gets it there.
    const firstTimePaid = trade.status !== "PAID";

    const existing = await tx.walletTransaction.findUnique({ where: { tradeId } });
    if (existing) {
      // Already credited (e.g. webhook + poller raced). Make sure the trade lands on PAID
      // so it stops being counted as an active trade, and award the score once.
      if (firstTimePaid) {
        await tx.trade.update({ where: { id: trade.id }, data: { status: "PAID" } });
        await tx.user.update({ where: { id: trade.userId }, data: { goodScore: { increment: 1 } } });
      }
      return { alreadyPaid: true, trade, statusBeforePay };
    }

    const amount = new Prisma.Decimal(trade.finalPayout ?? trade.quotedPayout);

    await applyWalletChange(tx, trade.userId, trade.payoutCurrency, amount, "TRADE_CREDIT", {
      tradeId: trade.id,
      description: `Payout for ${trade.country} card trade`,
    });

    // Referral bonus (1% by default) for life.
    const seller = await tx.user.findUnique({ where: { id: trade.userId } });
    if (seller?.referredById) {
      const bonus = amount.mul(config.referralPercent).div(100);
      if (bonus.greaterThan(0)) {
        await applyWalletChange(tx, seller.referredById, trade.payoutCurrency, bonus, "REFERRAL_BONUS", {
          description: `Referral bonus (${config.referralPercent}%) from a referral's trade`,
        });
        await tx.referralEarning.create({
          data: {
            earnerId: seller.referredById,
            sourceId: seller.id,
            currency: trade.payoutCurrency,
            amount: bonus,
            description: `Trade payout referral bonus`,
          },
        });
      }
    }

    await tx.trade.update({ where: { id: trade.id }, data: { status: "PAID" } });
    // Reward the successful, completed trade with +1 good transaction score.
    if (firstTimePaid) {
      await tx.user.update({ where: { id: trade.userId }, data: { goodScore: { increment: 1 } } });
    }
    return { alreadyPaid: false, trade, statusBeforePay, referredById: seller?.referredById ?? null, amount };
  });

  if (!result.alreadyPaid) {
    // Direct PAID (skip APPROVED) — still counts as a purchase for ads.
    if (result.statusBeforePay !== "APPROVED") {
      trackTradePurchaseConversion(tradeId);
    }
    const t = result.trade;
    await notify({
      userId: t.userId,
      title: "Trade paid",
      body: `Your wallet has been credited ${Number(t.finalPayout ?? t.quotedPayout)} ${t.payoutCurrency}.`,
      link: `/dashboard/trades/${t.id}`,
      emailDetail: t.tradeNumber ? `Trade ID: ${t.tradeNumber}` : undefined,
      category: "tradeStatus",
    });
    if ((result as any).referredById) {
      await notify({
        userId: (result as any).referredById,
        title: "Referral bonus earned",
        body: `You earned a referral bonus in ${t.payoutCurrency} from your referral's successful trade.`,
        link: `/dashboard/referrals`,
        category: "referral",
      });
    }
  }
}

/**
 * Self-heal trades that were credited to a wallet but never moved to PAID
 * (e.g. a webhook/poller race left them stuck at APPROVED, so they still
 * counted as "active"). Marks each PAID and awards the good transaction score.
 * Idempotent — only touches trades that have a credit but aren't PAID/CANCELLED/REJECTED.
 */
export async function reconcilePaidTrades(): Promise<number> {
  const stuck = await prisma.trade.findMany({
    where: {
      status: { notIn: ["PAID", "CANCELLED", "REJECTED"] },
      transaction: { is: { type: "TRADE_CREDIT" } },
    },
    select: { id: true, userId: true },
  });

  if (!stuck.length) return 0;

  for (const trade of stuck) {
    await prisma.$transaction([
      prisma.trade.update({ where: { id: trade.id }, data: { status: "PAID" } }),
      prisma.user.update({ where: { id: trade.userId }, data: { goodScore: { increment: 1 } } }),
    ]);
  }

  return stuck.length;
}
