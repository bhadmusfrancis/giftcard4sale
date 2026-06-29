export function money(amount: number, currency: string): string {
  const symbols: Record<string, string> = { NGN: "₦", USDT: "", GHS: "₵" };
  const sym = symbols[currency] ?? "";
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: currency === "USDT" ? 2 : 2,
    maximumFractionDigits: currency === "USDT" ? 4 : 2,
  });
  return currency === "USDT" ? `${formatted} USDT` : `${sym}${formatted}`;
}

export function date(d: string | Date): string {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  INFO_REQUESTED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-slate-200 text-slate-700",
};

/** Plain-language meaning of each trade status (admin-facing). */
export const STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING:
    "Submitted and waiting to be processed — either queued for automatic reselling on NoOnes or held for manual admin review.",
  PROCESSING:
    "The card is live on NoOnes and being verified/sold. The wallet is credited automatically once the marketplace releases the funds.",
  INFO_REQUESTED:
    "More information is needed from the seller before the trade can continue. See the trade chat.",
  APPROVED:
    "The card sale succeeded on NoOnes. The payout is approved and the wallet is being credited.",
  REJECTED:
    "The trade failed — invalid/used card, a marketplace dispute, or an admin rejection. No payout is made.",
  PAID: "Payout has been credited to the seller's wallet. The trade is complete.",
  CANCELLED:
    "The trade was cancelled by the seller or an admin before completion. No payout is made.",
};

/** Short status meaning shown to the seller on their own trades. */
export const SELLER_STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: "We've received your card and it's waiting to be processed.",
  PROCESSING:
    "Your card is being verified and sold. Your wallet is credited automatically once it completes — no action needed.",
  INFO_REQUESTED: "We need a bit more information from you. Please check the trade chat below.",
  APPROVED: "Success! Your trade was approved and your wallet is being credited.",
  REJECTED: "This trade was rejected. See the reason below or contact support.",
  PAID: "Done — your wallet has been credited for this trade.",
  CANCELLED: "This trade was cancelled. No payout was made.",
};

export const STATUS_FILTER_LABELS: Record<string, string> = {
  "": "All trades, any status.",
  ...STATUS_DESCRIPTIONS,
};
