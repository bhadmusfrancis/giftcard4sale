import { canCancelTrade as canCancelTradeShared } from "@gc4s/shared";
import { prisma } from "../prisma";

export { canCancelTradeShared as canCancelTrade };

export async function cancelTrade(
  tradeId: string,
  options: { byAdmin?: boolean; reason?: string } = {}
): Promise<void> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) throw new Error("Trade not found");

  const check = canCancelTradeShared(trade, !!options.byAdmin);
  if (!check.ok) throw new Error(check.error);

  await prisma.trade.updateMany({
    where: { id: tradeId, status: { notIn: ["CANCELLED", "PAID", "REJECTED"] } },
    data: {
      status: "CANCELLED",
      rejectionReason:
        options.reason?.trim() ||
        (options.byAdmin ? "Cancelled by admin" : "Cancelled by user"),
      noonesAwaitingSend: false,
    },
  });
}
