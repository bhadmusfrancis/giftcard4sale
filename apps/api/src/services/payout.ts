import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { applyWalletChange } from "./wallet";
import { getRateConfig } from "./rateConfig";
import { notify } from "./notify";

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

    const existing = await tx.walletTransaction.findUnique({ where: { tradeId } });
    if (existing) return { alreadyPaid: true, trade };

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
    return { alreadyPaid: false, trade, referredById: seller?.referredById ?? null, amount };
  });

  if (!result.alreadyPaid) {
    const t = result.trade;
    await notify({
      userId: t.userId,
      title: "Trade paid",
      body: `Your wallet has been credited ${Number(t.finalPayout ?? t.quotedPayout)} ${t.payoutCurrency}.`,
      link: `/dashboard/wallet`,
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
