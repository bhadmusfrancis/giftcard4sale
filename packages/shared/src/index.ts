export * from "./types";
export * from "./rateCalculator";
export * from "./rateParser";
export * from "./tradeCancel";

export const SUPPORTED_PAYOUT_CURRENCIES = ["USDT", "NGN", "GHS"] as const;

// Flat network fee charged on USDT withdrawals (debited on top of the amount).
export const USDT_WITHDRAWAL_NETWORK_FEE = 4;

export function slugifyCardType(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Strip trailing "Gift Card" so "Amazon Gift Card" and "Amazon" share one identity. */
export function normalizeCardTypeName(name: string): string {
  let n = name.trim();
  let prev = "";
  while (n !== prev) {
    prev = n;
    n = n.replace(/\s+gift\s+card$/i, "").trim();
  }
  return n;
}

/** Remove a trailing "-gift-card" segment from an already slugified string. */
function stripGiftCardSlugSuffix(slug: string): string {
  return slug.replace(/(-gift-card)+$/i, "");
}

/** Canonical slug for deduping and matching card types across imports. */
export function canonicalCardSlug(name: string): string {
  return stripGiftCardSlugSuffix(slugifyCardType(normalizeCardTypeName(name)));
}

/**
 * Brand identity for spotting duplicate card types — looser than the slug.
 * Gift-card wording a source tacks on ("Gift Cards", "E-Gift Code",
 * "Vouchers", a bare "Gift") and apostrophes are ignored, so "Dicks Gift
 * Cards", "Cabela's E-Gift Code" and "CASHlib Vouchers" key the same as
 * "Dicks", "Cabela's" and "CASHlib Voucher". Never used as a URL.
 */
export function cardBrandKey(name: string): string {
  let n = name.toLowerCase().replace(/['’`]/g, "").trim();
  let prev = "";
  while (n !== prev) {
    prev = n;
    n = n.replace(/(^|[\s._-]+)(e-?gifts?|gifts?|cards?|codes?|e-?codes?|vouchers?)$/, "").trim();
  }
  return n.replace(/[^a-z0-9]/g, "") || name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// e.g. "Lowes" -> "sell-lowes-gift-card"; "H&M Gift Card" -> "sell-h-m-gift-card"
export function sellSlug(name: string): string {
  const base = stripGiftCardSlugSuffix(slugifyCardType(normalizeCardTypeName(name)));
  return `sell-${base}-gift-card`;
}

/** Collapse legacy URLs like sell-h-m-gift-card-gift-card → sell-h-m-gift-card. */
export function fixDuplicateSellSlug(slug: string): string {
  return slug.replace(/-gift-card-gift-card$/i, "-gift-card");
}
