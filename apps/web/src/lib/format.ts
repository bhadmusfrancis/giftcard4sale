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
