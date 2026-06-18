import { CardMedium } from "@prisma/client";
import { normalizeCardTypeName } from "@gc4s/shared";
import { CardRegionLock, tierMatchesRegionLock } from "./regionLock";

/** Fast tiers fetched on-demand when a card page has no stored rates yet. */
export const HYDRATION_RATE_TIERS = [
  { country: "US", currency: "USD", minDenom: 25, maxDenom: 500, sampleAmount: 100 },
] as const;

/** Default country/currency tiers synced from NoOnes when no rate row exists yet. */
export const DEFAULT_RATE_TIERS = [
  { country: "US", currency: "USD", minDenom: 25, maxDenom: 500, sampleAmount: 100 },
  { country: "UK", currency: "GBP", minDenom: 10, maxDenom: 500, sampleAmount: 100 },
  { country: "Germany", currency: "EUR", minDenom: 10, maxDenom: 500, sampleAmount: 100 },
  { country: "Canada", currency: "CAD", minDenom: 25, maxDenom: 500, sampleAmount: 100 },
  { country: "Australia", currency: "AUD", minDenom: 10, maxDenom: 500, sampleAmount: 100 },
] as const;

export const DEFAULT_RATE_CURRENCIES = new Set<string>(DEFAULT_RATE_TIERS.map((t) => t.currency));

/** Extra tiers for regional cards whose offers use non-default fiat currencies. */
const CURRENCY_TIER_META: Record<
  string,
  { country: string; sampleAmount: number; minDenom?: number; maxDenom?: number }
> = {
  CNY: { country: "China", sampleAmount: 500 },
  INR: { country: "India", sampleAmount: 1000 },
  JPY: { country: "Japan", sampleAmount: 5000 },
  SGD: { country: "Singapore", sampleAmount: 50 },
  NZD: { country: "New Zealand", sampleAmount: 100 },
  CHF: { country: "Switzerland", sampleAmount: 50 },
  MXN: { country: "Mexico", sampleAmount: 500 },
  BRL: { country: "Brazil", sampleAmount: 100 },
  PLN: { country: "Poland", sampleAmount: 100 },
  HKD: { country: "Hong Kong", sampleAmount: 500 },
  KRW: { country: "South Korea", sampleAmount: 50000 },
  MYR: { country: "Malaysia", sampleAmount: 100 },
  PHP: { country: "Philippines", sampleAmount: 500 },
  THB: { country: "Thailand", sampleAmount: 500 },
  AED: { country: "UAE", sampleAmount: 100 },
  SAR: { country: "Saudi Arabia", sampleAmount: 100 },
};

/** Build a sync tier for a fiat currency discovered on NoOnes offers. */
export function currencyTierFromCode(currency: string): Omit<RateSyncTarget, "medium"> {
  const code = currency.toUpperCase();
  const known = DEFAULT_RATE_TIERS.find((t) => t.currency === code);
  if (known) {
    return {
      country: known.country,
      currency: known.currency,
      minDenom: known.minDenom,
      maxDenom: known.maxDenom,
      sampleAmount: known.sampleAmount,
    };
  }

  const meta = CURRENCY_TIER_META[code];
  if (meta) {
    return {
      country: meta.country,
      currency: code,
      minDenom: meta.minDenom ?? null,
      maxDenom: meta.maxDenom ?? null,
      sampleAmount: meta.sampleAmount,
    };
  }

  return { country: code, currency: code, minDenom: null, maxDenom: null, sampleAmount: 100 };
}

/** Added only when NoOnes offers truly accept countries beyond the standard tiers. */
export const OTHER_COUNTRY_TIER = {
  country: "Other",
  currency: "USD",
  minDenom: null,
  maxDenom: null,
  sampleAmount: 100,
} as const;

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

/** Build rate rows to sync — full catalog for background jobs, or US-only for page hydration. */
export function buildSyncTargets(
  existing: {
    country: string;
    currency: string;
    minDenom: number | null;
    maxDenom: number | null;
    medium: CardMedium;
  }[],
  options?: { hydrationOnly?: boolean; regionLock?: CardRegionLock | null }
): RateSyncTarget[] {
  let tierSource: readonly {
    country: string;
    currency: string;
    minDenom: number;
    maxDenom: number;
    sampleAmount: number;
  }[] = options?.hydrationOnly ? HYDRATION_RATE_TIERS : DEFAULT_RATE_TIERS;

  if (options?.regionLock) {
    tierSource = DEFAULT_RATE_TIERS.filter((tier) => tierMatchesRegionLock(tier, options.regionLock!));
    if (!tierSource.length) {
      tierSource = HYDRATION_RATE_TIERS.filter((tier) => tierMatchesRegionLock(tier, options.regionLock!));
    }
  }

  const map = new Map<string, RateSyncTarget>();

  for (const r of existing) {
    if (options?.regionLock && !tierMatchesRegionLock(r, options.regionLock)) continue;
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
  for (const tier of tierSource) {
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

/** Add PHYSICAL + ECODE tiers for currencies discovered on NoOnes (e.g. CNY, INR). */
export function appendDiscoveredCurrencyTargets(
  targets: RateSyncTarget[],
  currencies: string[],
  regionLock?: CardRegionLock | null
): RateSyncTarget[] {
  if (regionLock) return targets;

  const map = new Map(targets.map((t) => [targetKey(t), t]));

  for (const currency of currencies) {
    if (DEFAULT_RATE_CURRENCIES.has(currency.toUpperCase())) continue;
    const tier = currencyTierFromCode(currency);
    for (const medium of MEDIUMS) {
      const key = targetKey({ ...tier, medium });
      if (!map.has(key)) {
        map.set(key, { ...tier, medium });
      }
    }
  }

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
