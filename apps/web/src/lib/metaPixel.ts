/** Meta Pixel helpers — Pixel ID is public (ships in page HTML). */

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "2231976064046353";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function isMetaPixelEnabled(): boolean {
  return Boolean(META_PIXEL_ID);
}

/** Read Meta browser cookies for Conversion API matching. */
export function getMetaClickIds(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const find = (name: string) => {
    const row = cookies.find((c) => c.startsWith(`${name}=`));
    return row ? decodeURIComponent(row.slice(name.length + 1)) : undefined;
  };
  return { fbp: find("_fbp"), fbc: find("_fbc") };
}

export function newMetaEventId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

export function trackMeta(
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
): void {
  if (typeof window === "undefined" || !META_PIXEL_ID || typeof window.fbq !== "function") return;
  if (options?.eventID) {
    window.fbq("track", event, params || {}, { eventID: options.eventID });
  } else {
    window.fbq("track", event, params || {});
  }
}

export function trackMetaCustom(
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
): void {
  if (typeof window === "undefined" || !META_PIXEL_ID || typeof window.fbq !== "function") return;
  if (options?.eventID) {
    window.fbq("trackCustom", event, params || {}, { eventID: options.eventID });
  } else {
    window.fbq("trackCustom", event, params || {});
  }
}
