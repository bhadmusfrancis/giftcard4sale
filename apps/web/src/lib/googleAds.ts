/** Google Ads (gtag) helpers — defaults match Ads Manager Purchase snippet. */

export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "AW-18316111267";
export const GOOGLE_ADS_PURCHASE_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL?.trim() || "r8PhCJy64M4cEKPb5p1E";
export const GOOGLE_ADS_LEAD_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL?.trim() || "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GCLID_KEY = "gc4s_gclid";
const PURCHASE_FIRED_PREFIX = "gc4s_gads_purchase_";

export function isGoogleAdsEnabled(): boolean {
  return Boolean(GOOGLE_ADS_ID);
}

/** Persist gclid from ad click URLs for later matching. */
export function captureGclidFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const gclid = new URLSearchParams(window.location.search).get("gclid");
    if (gclid) {
      localStorage.setItem(GCLID_KEY, gclid);
      document.cookie = `_gcl_aw=1.${Date.now()}.${encodeURIComponent(gclid)};path=/;max-age=${90 * 24 * 60 * 60};SameSite=Lax`;
    }
  } catch {
    /* ignore */
  }
}

export function getStoredGclid(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(GCLID_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function sendTo(label: string): string {
  return `${GOOGLE_ADS_ID}/${label}`;
}

/**
 * Fire a Google Ads conversion (Event method — not a thank-you URL).
 * Always pass transaction_id so Google can dedupe retries.
 */
export function trackGoogleAdsConversion(opts: {
  label: string;
  value?: number;
  currency?: string;
  transactionId?: string;
}): void {
  if (typeof window === "undefined" || !GOOGLE_ADS_ID || !opts.label) return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", "conversion", {
    send_to: sendTo(opts.label),
    value: opts.value,
    currency: opts.currency,
    transaction_id: opts.transactionId,
  });
}

/** Purchase conversion — fires once per trade id in this browser. */
export function trackGoogleAdsPurchase(opts: {
  tradeId: string;
  value: number;
  currency: string;
}): void {
  if (!GOOGLE_ADS_PURCHASE_LABEL || !opts.tradeId) return;
  try {
    const key = PURCHASE_FIRED_PREFIX + opts.tradeId;
    if (localStorage.getItem(key)) return;
    trackGoogleAdsConversion({
      label: GOOGLE_ADS_PURCHASE_LABEL,
      value: opts.value,
      currency: opts.currency,
      transactionId: opts.tradeId,
    });
    // Also send GA4-style purchase for linked GA4 properties
    if (typeof window.gtag === "function") {
      window.gtag("event", "purchase", {
        transaction_id: opts.tradeId,
        value: opts.value,
        currency: opts.currency,
      });
    }
    localStorage.setItem(key, "1");
  } catch {
    trackGoogleAdsConversion({
      label: GOOGLE_ADS_PURCHASE_LABEL,
      value: opts.value,
      currency: opts.currency,
      transactionId: opts.tradeId,
    });
  }
}

/** Lead / trade submitted conversion. */
export function trackGoogleAdsLead(opts: {
  tradeId: string;
  value?: number;
  currency?: string;
}): void {
  if (!GOOGLE_ADS_LEAD_LABEL) return;
  trackGoogleAdsConversion({
    label: GOOGLE_ADS_LEAD_LABEL,
    value: opts.value,
    currency: opts.currency,
    transactionId: `lead_${opts.tradeId}`,
  });
}
