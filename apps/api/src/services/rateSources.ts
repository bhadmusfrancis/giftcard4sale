/**
 * Provenance flags stored on `Rate.speed`.
 *
 * Anything not listed here (`SLOW`, `FAST`, `null`) is an admin-owned manual
 * rate and must never be overwritten by a sync.
 */
export const STT_RATE_SPEED = "STT";
export const SOGO_RATE_SPEED = "SOGO";
/** Legacy marketplace rows. No longer produced, but existing rows stay quotable. */
export const PARTNER_RATE_SPEED = "PARTNER";

/** Every speed a sync may create or supersede. */
export const SYNCED_RATE_SPEEDS = [STT_RATE_SPEED, SOGO_RATE_SPEED, PARTNER_RATE_SPEED];

/** Higher wins. A source may only supersede rows from a weaker source. */
const SOURCE_PRIORITY: Record<string, number> = {
  [STT_RATE_SPEED]: 3,
  [SOGO_RATE_SPEED]: 2,
  [PARTNER_RATE_SPEED]: 1,
};

/** Speeds the given source outranks, so its writes may retire them. */
export function weakerRateSources(speed: string): string[] {
  const rank = SOURCE_PRIORITY[speed] ?? 0;
  return SYNCED_RATE_SPEEDS.filter((s) => (SOURCE_PRIORITY[s] ?? 0) < rank);
}

export function isManualRateSpeed(speed: string | null | undefined): boolean {
  return !speed || !SYNCED_RATE_SPEEDS.includes(speed);
}
