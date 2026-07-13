import { prisma } from "../prisma";
import { trackMetaEvent } from "./metaConversions";
import { env } from "../env";

/**
 * Meta Purchase + TradeCompleted when a trade is approved or NoOnes releases funds.
 * Deduped per trade via event_id (purchase_{tradeId}).
 */
export function trackTradePurchaseConversion(tradeId: string): void {
  void prisma.trade
    .findUnique({
      where: { id: tradeId },
      select: {
        id: true,
        tradeNumber: true,
        userId: true,
        cardTypeId: true,
        finalPayout: true,
        quotedPayout: true,
        payoutCurrency: true,
        status: true,
      },
    })
    .then(async (t) => {
      if (!t || t.status === "CANCELLED" || t.status === "REJECTED") return;

      const u = await prisma.user.findUnique({
        where: { id: t.userId },
        select: { email: true },
      });
      const card = await prisma.cardType.findUnique({
        where: { id: t.cardTypeId },
        select: { name: true, slug: true },
      });

      const value = Number(t.finalPayout ?? t.quotedPayout);
      const eventId = `purchase_${t.id}`;
      const userData = {
        email: u?.email,
        externalId: t.userId,
      };
      const customData = {
        value,
        currency: t.payoutCurrency,
        content_name: card?.name,
        content_ids: card?.slug ? [card.slug] : undefined,
        content_type: "product",
        order_id: t.tradeNumber || t.id,
      };

      trackMetaEvent({
        eventName: "Purchase",
        eventId,
        eventSourceUrl: `${env.webUrl}/dashboard/trades/${t.id}`,
        actionSource: "system_generated",
        userData,
        customData,
      });
      trackMetaEvent({
        eventName: "TradeCompleted",
        eventId: `trade_${t.id}`,
        eventSourceUrl: `${env.webUrl}/dashboard/trades/${t.id}`,
        actionSource: "system_generated",
        userData,
        customData,
      });
    })
    .catch((err) => console.error("[meta-capi] purchase track failed:", (err as Error).message));
}
