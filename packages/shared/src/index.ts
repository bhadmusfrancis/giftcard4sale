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

/** Strip trailing "Gift Card" so "Amazon Gift Card" and "Amazon" share one identity. */
export function normalizeCardTypeName(name: string): string {
  return name.trim().replace(/\s+gift\s+card$/i, "").trim();
}

/** Canonical slug for deduping and matching card types across imports. */
export function canonicalCardSlug(name: string): string {
  return slugifyCardType(normalizeCardTypeName(name));
}

// e.g. "Lowes" -> "sell-lowes-gift-card"
export function sellSlug(name: string): string {
  return `sell-${slugifyCardType(normalizeCardTypeName(name))}-gift-card`;
}
