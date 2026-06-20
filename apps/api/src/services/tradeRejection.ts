import { prisma } from "../prisma";

/** Reject a trade once and add +1 bad score to the seller. */
export async function rejectTradeWithBadScore(
  tradeId: string,
  data: { rejectionReason?: string; noonesStatus?: string; noonesTradeHash?: string }
): Promise<boolean> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || trade.status === "REJECTED" || trade.status === "PAID" || trade.status === "CANCELLED") return false;

  await prisma.$transaction([
    prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: "REJECTED",
        rejectionReason: data.rejectionReason ?? trade.rejectionReason,
        ...(data.noonesStatus ? { noonesStatus: data.noonesStatus } : {}),
        ...(data.noonesTradeHash ? { noonesTradeHash: data.noonesTradeHash } : {}),
        noonesAwaitingSend: false,
      },
    }),
    prisma.user.update({
      where: { id: trade.userId },
      data: { badScore: { increment: 1 } },
    }),
  ]);

  return true;
}
