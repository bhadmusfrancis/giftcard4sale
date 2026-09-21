import { canonicalCardSlug } from "@gc4s/shared";
import { ProxyAgent } from "undici";
import { env } from "../../env";
import { currencyTierFromCode } from "../noones/rateCatalog";
import type { SyncedCardRate } from "../rateTypes";

/**
 * SafeTheTrade gift-card rates.
 *
 * The site is a client-rendered SPA, so there is nothing to scrape from its
 * HTML. Its public JSON feed is read instead — no key or account needed.
 *
 * Only `sell` offers are priced. On this book an offer's type is stated from
 * its owner's side: a `sell` owner sells crypto and is paid in gift cards, so
 * they are the counterparty that takes a card off our hands and releases
 * crypto — the trade we actually make. `buy` offers are the mirror image
 * (card holders shopping for crypto) and are no use as a resale price.
 */

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; GiftCard4Sale/1.0; +https://giftcard4sale.com) rates-sync",
  Accept: "application/json",
};

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Plausible share of face value a trader will release in crypto for a card.
 * Listings outside this band are bait or typos — nobody honours 98% of face,
 * and 5% is not a market price. The ceiling brackets the range Sogo actually
 * publishes (roughly 37-78%), so a marketplace quote can never commit us to a
 * payout well above what the card is worth.
 */
const MIN_FACE_FRACTION = 0.15;
const MAX_FACE_FRACTION = 0.8;

/**
 * Categories rather than brands ("Any Visa, MasterCard and AmEx", "Gift Cards
 * (Miscellaneous Retailers)", "Target/GameStop/BestBuy Offline"). They may
 * price a card already in the catalog, but must never create one.
 */
const AGGREGATE_METHOD_NAME = /\b(any|misc|miscellaneous|other|various|virtual)\b|[/(]/i;

/** Cards denominated in our own payout currency are not something we resell. */
const SKIPPED_CURRENCIES = new Set(["NGN"]);

/** Listings whose brand cannot be identified from the name at all. */
const IGNORED_METHOD_IDS = new Set(["stream-gift-card-code"]);

interface SttOffer {
  id?: string;
  ownerId?: string;
  ownerUsername?: string;
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

interface SttPaymentMethod {
  id?: string;
  name?: string;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * "Walmart E-Gift Code" -> "Walmart". Only the gift-card wording is dropped:
 * "Roblox Game Card" and "Costco Cash Card" are the brand names themselves.
 */
function cardNameFromMethod(methodId: string, apiName?: string): string {
  const source = (apiName?.trim() || methodId.replace(/-/g, " ")).trim();
  let name = source;
  let previous = "";
  while (name !== previous) {
    previous = name;
    name = name.replace(/\s*(e-?)?gift\s*(cards?|codes?|vouchers?)$/i, "").trim();
  }
  if (!name) name = source;
  return apiName?.trim() ? name : name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface DenomSample {
  minFiat: number;
  /** `Infinity` when the offer states no upper bound. */
  maxFiat: number;
  owner: string;
}

/**
 * The amount band at least `minOwners` distinct sellers will actually take.
 *
 * A tier's advertised range cannot come from its most extreme listing: one
 * trader accepting $2-$5 does not make a $5 card tradable, and one accepting
 * $1,000 does not make that amount sellable either. The bound is the widest
 * contiguous band covered by enough independent owners — the same distinct-
 * seller test the median price has to pass. When the book is too disjoint for
 * the full threshold, the requirement relaxes until some band exists.
 */
function coveredDenomRange(samples: DenomSample[], minOwners: number): { min: number; max: number } | null {
  const byOwner = new Map<string, { min: number; max: number }[]>();
  const bounds = new Set<number>();
  for (const s of samples) {
    const list = byOwner.get(s.owner) ?? [];
    list.push({ min: s.minFiat, max: s.maxFiat });
    byOwner.set(s.owner, list);
    bounds.add(s.minFiat);
    if (Number.isFinite(s.maxFiat)) bounds.add(s.maxFiat);
  }
  const points = [...bounds].sort((a, b) => a - b);
  if (!points.length) return null;

  const ownersCovering = (x: number) => {
    let n = 0;
    for (const ivs of byOwner.values()) {
      if (ivs.some((iv) => iv.min <= x && x <= iv.max)) n++;
    }
    return n;
  };

  for (let need = Math.max(1, Math.min(minOwners, byOwner.size)); need >= 1; need--) {
    let best: { min: number; max: number } | null = null;
    let cur: { min: number; max: number } | null = null;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const next = points[i + 1];
      // Coverage is constant between boundary points, so the midpoint stands
      // in for the whole open segment.
      const segCovered = next != null && ownersCovering((p + next) / 2) >= need;
      if (ownersCovering(p) >= need) {
        cur = cur ? { min: cur.min, max: p } : { min: p, max: p };
      }
      if (segCovered) {
        cur = cur ? { min: cur.min, max: next } : { min: p, max: next };
      } else if (cur) {
        if (!best || cur.max - cur.min > best.max - best.min) best = cur;
        cur = null;
      }
    }
    if (cur && (!best || cur.max - cur.min > best.max - best.min)) best = cur;
    if (best) return best;
  }
  return null;
}

/**
 * The feed's origin answers HTTP 451 to some hosting IP ranges — Render's
 * egress among them — while serving 200 elsewhere. `SAFETHETRADE_PROXY_URL`
 * picks another egress: a `{url}` template is a fetch relay the request is
 * encoded into; anything else is treated as a CONNECT proxy for the request's
 * dispatcher.
 */
const proxyUrl = env.safeTheTrade.proxyUrl;
const relayTemplate = proxyUrl.includes("{url}") ? proxyUrl : null;
const connectDispatcher = proxyUrl && !relayTemplate ? new ProxyAgent(proxyUrl) : undefined;

async function fetchJson<T>(url: string): Promise<T> {
  const target = relayTemplate ? relayTemplate.replace("{url}", encodeURIComponent(url)) : url;
  const res = await fetch(target, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ...(connectDispatcher ? { dispatcher: connectDispatcher } : {}),
  } as RequestInit & { dispatcher?: ProxyAgent });
  if (!res.ok) {
    // Say when the refusal came through the relay, otherwise a proxied 451
    // reads identically to a direct one and the failure can't be diagnosed.
    const via = relayTemplate || connectDispatcher ? " (via proxy)" : "";
    throw new Error(`${url} responded ${res.status}${via}`);
  }
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
 * Every gift-card brand the marketplace lists, by payment-method id. Brands
 * without offers are included, so this is only used for display names.
 */
async function fetchGiftCardMethodNames(): Promise<Map<string, string>> {
  try {
    const methods = await fetchJson<SttPaymentMethod[]>(
      `${env.safeTheTrade.apiUrl}/payment-methods?category=gift-cards`
    );
    if (!Array.isArray(methods)) return new Map();
    return new Map(
      methods
        .filter((m) => m.id && m.name)
        .map((m) => [String(m.id), String(m.name)] as const)
    );
  } catch (err) {
    console.warn("SafeTheTrade payment methods:", (err as Error).message);
    return new Map();
  }
}

/**
 * Best available gift-card rates, expressed as NGN per unit of card face value.
 *
 * Every brand + currency pair with a live offer is priced, which is what lets
 * this source cover the brands Sogo does not publish at all. Offers are reduced
 * with a median rather than a maximum: the top of this book is consistently
 * bait priced near face value.
 */
export async function fetchSafeTheTradeRates(
  ngnPerUsdt: number,
  minOfferOwners: number
): Promise<SyncedCardRate[]> {
  if (!(ngnPerUsdt > 0)) return [];

  const [offers, methodNames] = await Promise.all([
    fetchJson<SttOffer[]>(`${env.safeTheTrade.apiUrl}/offers?category=gift-cards`),
    fetchGiftCardMethodNames(),
  ]);
  if (!Array.isArray(offers)) throw new Error("SafeTheTrade returned an unexpected offers payload");

  const needsBtc = offers.some((o) => /^(BTC|XBT)$/i.test(String(o.currency ?? "")));
  const btcUsd = needsBtc ? await fetchBtcUsd() : 0;

  interface Sample {
    usdtPerFiatUnit: number;
    minFiat: number;
    maxFiat: number;
    owner: string;
  }
  const grouped = new Map<string, { methodId: string; currency: string; samples: Sample[] }>();
  let anonymousOwner = 0;

  for (const offer of offers) {
    if (offer.type !== "sell") continue;
    if (offer.active === false || offer.deauthorized || offer.visibility !== "public") continue;

    const methodId = String(offer.paymentMethodId ?? "").trim();
    const currency = String(offer.fiatCurrency ?? offer.pricing?.fiatCurrency ?? "").toUpperCase();
    const pricePerUnit = num(offer.pricing?.pricePerUnit);
    const spotRate = num(offer.pricing?.spotRate);
    if (!methodId || !currency || !(pricePerUnit > 0) || !(spotRate > 0)) continue;
    if (SKIPPED_CURRENCIES.has(currency) || IGNORED_METHOD_IDS.has(methodId)) continue;

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
    const maxFiat = num(offer.maxFiat);
    entry.samples.push({
      usdtPerFiatUnit,
      minFiat: Math.max(1, Math.round(num(offer.minFiat))),
      // An offer that states no upper bound takes any amount above its
      // minimum — Infinity, not a bogus $1 ceiling.
      maxFiat: maxFiat > 0 ? Math.max(1, Math.round(maxFiat)) : Infinity,
      // Several listings from one trader are still one opinion, so the owner
      // is counted, not the listing. An owner the feed does not identify is
      // treated as distinct — undercounting would hide a single-seller book.
      owner:
        String(offer.ownerId ?? offer.ownerUsername ?? offer.id ?? "").trim() ||
        `anonymous-${++anonymousOwner}`,
    });
    grouped.set(key, entry);
  }

  const rows: SyncedCardRate[] = [];
  for (const { methodId, currency, samples } of grouped.values()) {
    const usdtPerFiatUnit = median(samples.map((s) => s.usdtPerFiatUnit));
    const nairaPerUnit = usdtPerFiatUnit * ngnPerUsdt;
    if (!(nairaPerUnit > 0)) continue;

    const tier = currencyTierFromCode(currency);
    const range = coveredDenomRange(samples, minOfferOwners);
    const minDenom = Math.max(1, Math.round(range?.min ?? tier.minDenom ?? 1));
    const maxDenom = Math.max(minDenom, Math.round(range?.max ?? tier.maxDenom ?? minDenom));
    const cardName = cardNameFromMethod(methodId, methodNames.get(methodId));

    rows.push({
      cardName,
      slugHint: canonicalCardSlug(methodId),
      currency,
      country: tier.country,
      minDenom,
      maxDenom,
      nairaPerUnit,
      storedQuotes: { NONE: nairaPerUnit, CASH: nairaPerUnit, DEBIT: nairaPerUnit },
      offerCount: samples.length,
      ownerCount: new Set(samples.map((s) => s.owner)).size,
      catalogCandidate: !AGGREGATE_METHOD_NAME.test(cardName),
    });
  }

  if (!rows.length) throw new Error("No usable gift-card rates in the SafeTheTrade offer feed");
  return rows;
}
