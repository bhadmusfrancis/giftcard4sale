/** Restricts which country/currency tiers a card may sync and display. */
export interface CardRegionLock {
  countries: string[];
  currencies: string[];
}

const REGION_RULES: { pattern: RegExp; lock: CardRegionLock }[] = [
  { pattern: /us[-_ ]only|\(us only\)/i, lock: { countries: ["US"], currencies: ["USD"] } },
  { pattern: /uk[-_ ]only|\(uk only\)/i, lock: { countries: ["UK"], currencies: ["GBP"] } },
  {
    pattern: /eu[-_ ]only|\(eu only\)|europe[-_ ]only|\(europe only\)/i,
    lock: { countries: ["Euro"], currencies: ["EUR"] },
  },
  {
    pattern: /canada[-_ ]only|\(canada only\)|cad[-_ ]only/i,
    lock: { countries: ["Canada"], currencies: ["CAD"] },
  },
  {
    pattern: /australia[-_ ]only|\(australia only\)|aud[-_ ]only/i,
    lock: { countries: ["Australia"], currencies: ["AUD"] },
  },
];

/** Detect region-locked cards from slug, display name, or NoOnes payment-method slug. */
export function resolveCardRegionLock(
  slug: string,
  name: string,
  paymentMethod?: string | null
): CardRegionLock | null {
  const haystack = `${slug} ${name} ${paymentMethod ?? ""}`;
  for (const { pattern, lock } of REGION_RULES) {
    if (pattern.test(haystack)) return lock;
  }
  return null;
}

export function tierMatchesRegionLock(
  tier: { country: string; currency: string },
  lock: CardRegionLock
): boolean {
  return (
    lock.currencies.includes(tier.currency.toUpperCase()) &&
    lock.countries.includes(tier.country)
  );
}
