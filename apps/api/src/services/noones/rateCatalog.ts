import { CardMedium } from "@prisma/client";
import { normalizeCardTypeName } from "@gc4s/shared";

/** Default country/currency tiers synced from NoOnes when no rate row exists yet. */
export const DEFAULT_RATE_TIERS = [
  { country: "US", currency: "USD", minDenom: 25, maxDenom: 500, sampleAmount: 100 },
  { country: "UK", currency: "GBP", minDenom: 10, maxDenom: 500, sampleAmount: 100 },
  { country: "Germany", currency: "EUR", minDenom: 10, maxDenom: 500, sampleAmount: 100 },
  { country: "Canada", currency: "CAD", minDenom: 25, maxDenom: 500, sampleAmount: 100 },
  { country: "Australia", currency: "AUD", minDenom: 10, maxDenom: 500, sampleAmount: 100 },
  { country: "Other", currency: "USD", minDenom: null, maxDenom: null, sampleAmount: 100 },
] as const;

const MEDIUMS: CardMedium[] = ["PHYSICAL", "ECODE"];

export interface RateSyncTarget {
  country: string;
  currency: string;
  minDenom: number | null;
  maxDenom: number | null;
  medium: CardMedium;
  sampleAmount: number;
}

function targetKey(t: Pick<RateSyncTarget, "country" | "medium" | "minDenom" | "maxDenom">): string {
  return [t.country, t.medium, t.minDenom ?? "", t.maxDenom ?? ""].join("|");
}

function sampleFor(minDenom: number | null, maxDenom: number | null, fallback = 100): number {
  if (minDenom != null && maxDenom != null) return Math.round((minDenom + maxDenom) / 2);
  return minDenom ?? maxDenom ?? fallback;
}

/** Build every rate row we should try to fill from NoOnes for one card type. */
export function buildSyncTargets(
  existing: {
    country: string;
    currency: string;
    minDenom: number | null;
    maxDenom: number | null;
    medium: CardMedium;
  }[]
): RateSyncTarget[] {
  const map = new Map<string, RateSyncTarget>();

  for (const r of existing) {
    map.set(targetKey(r), {
      country: r.country,
      currency: r.currency,
      minDenom: r.minDenom,
      maxDenom: r.maxDenom,
      medium: r.medium,
      sampleAmount: sampleFor(r.minDenom, r.maxDenom),
    });
  }

  // Ensure both PHYSICAL and ECODE exist for every known tier.
  for (const tier of DEFAULT_RATE_TIERS) {
    for (const medium of MEDIUMS) {
      const key = targetKey({ country: tier.country, medium, minDenom: tier.minDenom, maxDenom: tier.maxDenom });
      if (!map.has(key)) {
        map.set(key, {
          country: tier.country,
          currency: tier.currency,
          minDenom: tier.minDenom,
          maxDenom: tier.maxDenom,
          medium,
          sampleAmount: tier.sampleAmount,
        });
      }
    }
  }

  // Cards with no rates at all: full default catalog (already added above).
  // Cards with only PHYSICAL rows: ECODE rows added by the loop above.
  return [...map.values()];
}

/** Turn a NoOnes payment-method slug into a display name for CardType. */
export function paymentMethodToCardName(slug: string, name?: string): string {
  const display = name?.trim()
    ? name.trim()
    : slug
        .replace(/-gift-card$/i, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  return normalizeCardTypeName(display);
}
