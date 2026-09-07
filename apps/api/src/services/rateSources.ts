/**
 * Provenance flags stored on `Rate.speed`.
 *
 * Anything not listed here (`SLOW`, `FAST`, `null`) is an admin-owned manual
 * rate and must never be overwritten by a sync.
 */
export const SOGO_RATE_SPEED = "SOGO";
export const STT_RATE_SPEED = "STT";
/** Legacy marketplace rows. No longer produced, but existing rows stay quotable. */
export const PARTNER_RATE_SPEED = "PARTNER";

/** Every speed a sync may create or supersede. */
export const SYNCED_RATE_SPEEDS = [SOGO_RATE_SPEED, STT_RATE_SPEED, PARTNER_RATE_SPEED];

export function isManualRateSpeed(speed: string | null | undefined): boolean {
  return !speed || !SYNCED_RATE_SPEEDS.includes(speed);
}
