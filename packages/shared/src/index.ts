export * from "./types";
export * from "./rateCalculator";
export * from "./rateParser";

export const SUPPORTED_PAYOUT_CURRENCIES = ["USDT", "NGN", "GHS"] as const;

export function slugifyCardType(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// e.g. "Lowes" -> "sell-lowes-gift-card"
export function sellSlug(name: string): string {
  return `sell-${slugifyCardType(name)}-gift-card`;
}
