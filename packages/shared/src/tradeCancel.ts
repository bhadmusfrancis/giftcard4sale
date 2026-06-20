import type { TradeStatus } from "./types";

const USER_CANCELLABLE: TradeStatus[] = ["PENDING", "INFO_REQUESTED"];
const ADMIN_CANCELLABLE: TradeStatus[] = ["PENDING", "INFO_REQUESTED", "PROCESSING"];

export function canCancelTrade(
  trade: { status: TradeStatus; noonesTradeHash?: string | null },
  asAdmin: boolean
): { ok: true } | { ok: false; error: string } {
  if (trade.status === "CANCELLED") return { ok: false, error: "Trade is already cancelled" };
  if (trade.status === "PAID") return { ok: false, error: "Paid trades cannot be cancelled" };
  if (trade.status === "REJECTED") return { ok: false, error: "Rejected trades cannot be cancelled" };
  if (trade.status === "APPROVED") return { ok: false, error: "Approved trades cannot be cancelled" };

  const allowed = asAdmin ? ADMIN_CANCELLABLE : USER_CANCELLABLE;
  if (!allowed.includes(trade.status)) {
    if (!asAdmin && trade.status === "PROCESSING") {
      return { ok: false, error: "This trade is being processed and cannot be cancelled" };
    }
    return { ok: false, error: `Trades in ${trade.status} status cannot be cancelled` };
  }

  if (!asAdmin && trade.noonesTradeHash) {
    return { ok: false, error: "This trade is being processed and cannot be cancelled" };
  }

  return { ok: true };
}
