import fs from "node:fs";
import path from "node:path";
import { canonicalCardSlug } from "@gc4s/shared";
import { isNoOnesConfigured, noonesPost } from "../noones/client";
import { currencyTierFromCode } from "../noones/rateCatalog";
import { getRateConfig } from "../rateConfig";
import type { NoOnesOffer } from "../noones/types";
import type { PartnerLastRate } from "./partnerFallback";

/** Contacted partner whose live Eneba / Paysafecard offers fill Sogo gaps. */
export const TOP10_TRADER = "TOP10_TRADER";

const LIVE_CARD_SLUGS = new Set(["eneba", "eneba-gift-card", "paysafecard"]);

/** Known live marketplace hashes so production can sync without local reports/. */
const TOP10_OFFER_HASHES = [
  "Z8o3shKNjfP", // Eneba EUR USDT
  "QP8TKUpEz8x", // Eneba PLN USDT
  "5KWeLPWiGnR", // Eneba GBP BTC
  "T4d7SnV4Zwd", // Paysafecard EUR BTC
];

function reportsDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "reports");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), "reports");
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function cryptoRank(code: string): number {
  if (code === "USDT" || code === "USDC") return 3;
  if (code === "BTC" || code === "XBT") return 1;
  return 0;
}

function unwrapOffer(data: unknown): NoOnesOffer | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as NoOnesOffer & { offer?: NoOnesOffer };
  return raw.offer || raw;
}

function offerOwner(offer: NoOnesOffer): string {
  const extra = offer as NoOnesOffer & { username?: string; user_name?: string };
  return str(offer.offer_owner_username || extra.username || extra.user_name);
}

function offerHash(offer: NoOnesOffer): string {
  return str(offer.offer_hash || offer.offer_id);
}

function hashesFromCache(): string[] {
  const cachePath = path.join(reportsDir(), ".extract-cache.json");
  if (!fs.existsSync(cachePath)) return [];
  try {
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf8")) as {
      offers?: Array<{ offerId?: string; partner?: string; cardType?: string; cardSlug?: string }>;
    };
    return (cache.offers ?? [])
      .filter((row) => str(row.partner).toLowerCase() === TOP10_TRADER.toLowerCase())
      .filter((row) => LIVE_CARD_SLUGS.has(canonicalCardSlug(row.cardType || row.cardSlug || "")))
      .map((row) => str(row.offerId))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchOffer(hash: string): Promise<NoOnesOffer | null> {
  try {
    const data = await noonesPost<unknown>("offer/get", { offer_hash: hash });
    return unwrapOffer(data);
  } catch (err) {
    console.warn(`TOP10_TRADER offer ${hash}:`, (err as Error).message);
    return null;
  }
}

let btcUsdtCache: { value: number; fetchedAt: number } | null = null;

async function fetchBtcUsdt(): Promise<number> {
  const now = Date.now();
  if (btcUsdtCache && now - btcUsdtCache.fetchedAt < 10 * 60_000) return btcUsdtCache.value;

  const urls = [
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      const price =
        num(json.price) ||
        num((json.bitcoin as { usd?: unknown } | undefined)?.usd);
      if (price > 1000) {
        btcUsdtCache = { value: price, fetchedAt: now };
        return price;
      }
    } catch {
      /* try next source */
    }
  }
  return 0;
}

function nairaFromOffer(offer: NoOnesOffer, ngnPerUsdt: number, btcUsdt: number): number | null {
  const price = num(offer.fiat_price_per_crypto);
  if (!(price > 0)) return null;
  const crypto = str(offer.crypto_currency_code).toUpperCase();
  const cryptoPerUnit = 1 / price;
  if (!(cryptoPerUnit > 0)) return null;

  if (crypto === "USDT" || crypto === "USDC") return cryptoPerUnit * ngnPerUsdt;
  if ((crypto === "BTC" || crypto === "XBT") && btcUsdt > 0) return cryptoPerUnit * btcUsdt * ngnPerUsdt;
  return null;
}

/**
 * Live Eneba and Paysafecard sell offers from TOP10_TRADER.
 * Prefer USDT quotes; convert BTC offers with a live BTC/USDT price.
 */
export async function loadTopTraderLiveRates(): Promise<PartnerLastRate[]> {
  if (!isNoOnesConfigured()) {
    console.warn("TOP10_TRADER live rates: NoOnes is not configured");
    return [];
  }

  const config = await getRateConfig();
  const ngnPerUsdt = config.rates.ngnPerUsdt;
  if (!(ngnPerUsdt > 0)) return [];

  const hashes = [...new Set([...TOP10_OFFER_HASHES, ...hashesFromCache()])];
  const offers = (await Promise.all(hashes.map(fetchOffer))).filter((offer): offer is NoOnesOffer => Boolean(offer));
  const needsBtc = offers.some((offer) => /^(BTC|XBT)$/i.test(str(offer.crypto_currency_code)));
  const btcUsdt = needsBtc ? await fetchBtcUsdt() : 0;
  if (needsBtc && !(btcUsdt > 0)) {
    console.warn("TOP10_TRADER live rates: BTC/USDT price unavailable; skipping BTC offers");
  }

  const best = new Map<string, PartnerLastRate & { rank: number }>();
  for (const offer of offers) {
    if (offer.active === false) continue;
    const owner = offerOwner(offer);
    if (owner && owner.toLowerCase() !== TOP10_TRADER.toLowerCase()) continue;
    if (str(offer.offer_type).toLowerCase() === "buy") continue;

    const cardName = str(offer.payment_method_name) || str(offer.payment_method_slug);
    const slug = canonicalCardSlug(cardName || str(offer.payment_method_slug));
    if (!cardName || !LIVE_CARD_SLUGS.has(slug)) continue;

    const currency = str(offer.fiat_currency_code || offer.currency_code).toUpperCase();
    const crypto = str(offer.crypto_currency_code).toUpperCase();
    const nairaPerUnit = nairaFromOffer(offer, ngnPerUsdt, btcUsdt);
    if (!currency || nairaPerUnit == null || !(nairaPerUnit > 0) || nairaPerUnit > ngnPerUsdt * 3) continue;

    const tier = currencyTierFromCode(currency);
    const minDenom = Math.max(1, Math.round(num(offer.fiat_amount_range_min ?? offer.fiat_amount_min) || tier.minDenom || 1));
    const maxDenom = Math.max(
      minDenom,
      Math.round(num(offer.fiat_amount_range_max ?? offer.fiat_amount_max) || tier.maxDenom || minDenom)
    );

    const key = `${slug}|${currency}`;
    const rank = cryptoRank(crypto);
    const existing = best.get(key);
    if (existing && existing.rank >= rank) continue;

    best.set(key, {
      cardName,
      currency,
      country: tier.country,
      minDenom,
      maxDenom,
      nairaPerUnit,
      storedQuotes: { NONE: nairaPerUnit, CASH: nairaPerUnit, DEBIT: nairaPerUnit },
      tradedAt: Date.now(),
      partner: TOP10_TRADER,
      rank,
    });
  }

  const rows = [...best.values()].map(({ rank: _rank, ...row }) => row);
  if (rows.length) {
    console.log(
      `TOP10_TRADER live rates: ${rows
        .map((row) => `${row.cardName} ${row.currency} ₦${row.nairaPerUnit.toFixed(0)}`)
        .join("; ")}`
    );
  } else {
    console.warn("TOP10_TRADER live rates: no usable Eneba/Paysafecard offers");
  }
  return rows;
}

/** Last-traded rows plus live TOP10_TRADER quotes (live wins on the same card+currency). */
export function mergePartnerRates(traded: PartnerLastRate[], live: PartnerLastRate[]): PartnerLastRate[] {
  const merged = new Map<string, PartnerLastRate>();
  for (const row of traded) merged.set(`${canonicalCardSlug(row.cardName)}|${row.currency}`, row);
  for (const row of live) merged.set(`${canonicalCardSlug(row.cardName)}|${row.currency}`, row);
  return [...merged.values()];
}
