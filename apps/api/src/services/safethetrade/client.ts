import { canonicalCardSlug } from "@gc4s/shared";
import { env } from "../../env";
import { currencyTierFromCode } from "../noones/rateCatalog";
import type { SyncedCardRate } from "../rateTypes";

/**
 * SafeTheTrade gift-card rates.
 *
 * The site is a client-rendered SPA, so there is nothing to scrape from its
 * HTML. Its public JSON feed is read instead — no key or account needed. The
 * feed is filtered server-side to gift-card offers that pay crypto, which keeps
 * the download to a few tens of kilobytes per sync.
 */

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; GiftCard4Sale/1.0; +https://giftcard4sale.com) rates-sync",
  Accept: "application/json",
};

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Plausible share of face value for a gift card, used to reject bait listings.
 * The top of this order book is routinely priced at 98-140% of face, which no
 * real buyer honours. The ceiling brackets the range Sogo actually publishes
 * (roughly 37-78%), so a marketplace quote can never commit us to a payout well
 * above what the card is worth.
 */
const MIN_FACE_FRACTION = 0.15;
const MAX_FACE_FRACTION = 0.8;

interface SttOffer {
  active?: boolean;
  deauthorized?: boolean;
  visibility?: string;
  type?: string;
  currency?: string;
  paymentMethodId?: string;
  fiatCurrency?: string;
  minFiat?: number;
  maxFiat?: number;
  pricing?: { fiatCurrency?: string; spotRate?: number; pricePerUnit?: number } | null;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** "walmart-gift-card" -> "Walmart"; keeps the raw id as a slug hint for dedup. */
function cardNameFromMethodId(methodId: string): string {
  const cleaned = methodId
    .replace(/-(e-)?gift-?(card|code)s?$/i, "")
    .replace(/-cards?$/i, "")
    .replace(/-/g, " ")
    .trim();
  if (!cleaned) return methodId;
  return cleaned.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return (await res.json()) as T;
}

let btcUsdCache: { value: number; fetchedAt: number } | null = null;

/** BTC/USD from SafeTheTrade's own spot feed, cached for the sync interval. */
async function fetchBtcUsd(): Promise<number> {
  if (btcUsdCache && Date.now() - btcUsdCache.fetchedAt < 30 * 60_000) return btcUsdCache.value;
  try {
    const json = await fetchJson<{ price?: unknown }>(`${env.safeTheTrade.apiUrl}/currency/btc`);
    const price = num(json.price);
    if (price > 1000) {
      btcUsdCache = { value: price, fetchedAt: Date.now() };
      return price;
    }
  } catch (err) {
    console.warn("SafeTheTrade BTC price:", (err as Error).message);
  }
  return 0;
}

/**
 * Best available gift-card rates, expressed as NGN per unit of card face value.
 *
 * Offers are grouped per card + currency and reduced with a median rather than a
 * maximum: the top of this book is consistently bait priced near face value.
 */
export async function fetchSafeTheTradeRates(ngnPerUsdt: number): Promise<SyncedCardRate[]> {
  if (!(ngnPerUsdt > 0)) return [];

  const offers = await fetchJson<SttOffer[]>(`${env.safeTheTrade.apiUrl}/offers?category=gift-cards&type=buy`);
  if (!Array.isArray(offers)) throw new Error("SafeTheTrade returned an unexpected offers payload");

  const needsBtc = offers.some((o) => /^(BTC|XBT)$/i.test(String(o.currency ?? "")));
  const btcUsd = needsBtc ? await fetchBtcUsd() : 0;

  interface Sample {
    usdtPerFiatUnit: number;
    minFiat: number;
    maxFiat: number;
  }
  const grouped = new Map<string, { methodId: string; currency: string; samples: Sample[] }>();

  for (const offer of offers) {
    if (offer.active === false || offer.deauthorized || offer.visibility !== "public") continue;

    const methodId = String(offer.paymentMethodId ?? "").trim();
    const currency = String(offer.fiatCurrency ?? offer.pricing?.fiatCurrency ?? "").toUpperCase();
    const pricePerUnit = num(offer.pricing?.pricePerUnit);
    const spotRate = num(offer.pricing?.spotRate);
    if (!methodId || !currency || !(pricePerUnit > 0) || !(spotRate > 0)) continue;

    // Share of face value the card seller receives. Currency-independent
    // because both figures are quoted in the card's own fiat currency.
    const faceFraction = spotRate / pricePerUnit;
    if (faceFraction < MIN_FACE_FRACTION || faceFraction > MAX_FACE_FRACTION) continue;

    const crypto = String(offer.currency ?? "").toUpperCase();
    const cryptoPerFiatUnit = 1 / pricePerUnit;
    let usdtPerFiatUnit = 0;
    if (crypto === "USDT" || crypto === "USDC") usdtPerFiatUnit = cryptoPerFiatUnit;
    else if ((crypto === "BTC" || crypto === "XBT") && btcUsd > 0) usdtPerFiatUnit = cryptoPerFiatUnit * btcUsd;
    if (!(usdtPerFiatUnit > 0)) continue;

    const key = `${methodId}|${currency}`;
    const entry = grouped.get(key) ?? { methodId, currency, samples: [] };
    entry.samples.push({
      usdtPerFiatUnit,
      minFiat: Math.max(1, Math.round(num(offer.minFiat))),
      maxFiat: Math.max(1, Math.round(num(offer.maxFiat))),
    });
    grouped.set(key, entry);
  }

  const rows: SyncedCardRate[] = [];
  for (const { methodId, currency, samples } of grouped.values()) {
    const usdtPerFiatUnit = median(samples.map((s) => s.usdtPerFiatUnit));
    const nairaPerUnit = usdtPerFiatUnit * ngnPerUsdt;
    if (!(nairaPerUnit > 0)) continue;

    const tier = currencyTierFromCode(currency);
    const minDenom = Math.max(1, Math.min(...samples.map((s) => s.minFiat)) || tier.minDenom || 1);
    const maxDenom = Math.max(minDenom, Math.max(...samples.map((s) => s.maxFiat)) || tier.maxDenom || minDenom);

    rows.push({
      cardName: cardNameFromMethodId(methodId),
      slugHint: canonicalCardSlug(methodId),
      currency,
      country: tier.country,
      minDenom,
      maxDenom,
      nairaPerUnit,
      storedQuotes: { NONE: nairaPerUnit, CASH: nairaPerUnit, DEBIT: nairaPerUnit },
    });
  }

  if (!rows.length) throw new Error("No usable gift-card rates in the SafeTheTrade offer feed");
  return rows;
}
