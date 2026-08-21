import fs from "node:fs";
import path from "node:path";
import { canonicalCardSlug, StoredQuotes } from "@gc4s/shared";
import { getRateConfig } from "../rateConfig";
import { currencyTierFromCode } from "../noones/rateCatalog";

export const PARTNER_RATE_SPEED = "PARTNER";

export interface PartnerLastRate {
  cardName: string;
  currency: string;
  country: string;
  minDenom: number;
  maxDenom: number;
  nairaPerUnit: number;
  storedQuotes: StoredQuotes;
  tradedAt: number;
  partner: string;
}

const OUR_USERNAME = "digital_flow";

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

function scaleCrypto(code: string, raw: number): number {
  if (!(raw > 0) || !code) return 0;
  if (code === "USDT" || code === "USDC") return raw / 1_000_000;
  return 0;
}

function isSuccessfulTrade(status: string, tradeStatus: string): boolean {
  const hay = `${status} ${tradeStatus}`.toLowerCase();
  if (/(cancel|expir|dispute|fail|unpaid|not.?paid)/.test(hay)) return false;
  return /(releas|success|complet|paid|done)/.test(hay) || !hay.trim();
}

function isGiftCardTrade(name: string, slug: string): boolean {
  const hay = `${slug} ${name}`.toLowerCase();
  if (
    /\b(bank transfer|wire transfer|swift|sepa|nip\b|faster payments|cash deposit|mobile money)\b/i.test(hay) &&
    !/gift|voucher|card/.test(hay)
  ) {
    return false;
  }
  return /gift|voucher|wunsch|itunes|steam|playstation|xbox|google.?play|paysafecard|neosurf|starbucks|costco|vanilla|apple.?card|eneba|nintendo|razer|sephora|ulta|nike|target|walmart|amazon|visa|amex/i.test(
    hay
  );
}

function partnerOf(trade: Record<string, unknown>): string {
  const buyer = str(trade.buyer || trade.buyer_username);
  const seller = str(trade.seller || trade.seller_username);
  const partner = str(trade.partner || trade.partner_username);
  const us = OUR_USERNAME;
  if (partner && partner.toLowerCase() !== us) return partner;
  if (buyer && buyer.toLowerCase() !== us) return buyer;
  if (seller && seller.toLowerCase() !== us) return seller;
  return partner || buyer || seller;
}

function tradeTime(trade: Record<string, unknown>): number {
  const raw = str(trade.completed_at || trade.ended_at || trade.started_at);
  if (!raw) return 0;
  const parsed = Date.parse(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function latestPartnerCsv(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((name) => /^noones-trade-partners-\d{4}-\d{2}-\d{2}\.csv$/i.test(name))
    .sort()
    .reverse();
  return files[0] ? path.join(dir, files[0]) : null;
}

/** Partners from the latest contacts report who dropped WhatsApp/Telegram/email/phone/other. */
export function loadContactedPartnerUsernames(): Set<string> {
  const dir = reportsDir();
  const csvPath = latestPartnerCsv(dir);
  const names = new Set<string>();
  if (!csvPath) return names;

  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return names;

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const partner = str(cols[0]);
    const whatsapp = str(cols[1]);
    const telegram = str(cols[2]);
    const email = str(cols[3]);
    const phone = str(cols[4]);
    const other = str(cols[5]);
    if (!partner) continue;
    if (whatsapp || telegram || email || phone || other) names.add(partner.toLowerCase());
  }
  return names;
}

function denomBounds(currency: string, amounts: number[]): { minDenom: number; maxDenom: number; country: string } {
  const tier = currencyTierFromCode(currency);
  const minFromTrades = amounts.length ? Math.min(...amounts) : 0;
  const maxFromTrades = amounts.length ? Math.max(...amounts) : 0;
  return {
    country: tier.country,
    minDenom: Math.max(1, Math.round(tier.minDenom && tier.minDenom > 0 ? Math.min(tier.minDenom, minFromTrades || tier.minDenom) : minFromTrades || 1)),
    maxDenom: Math.max(
      1,
      Math.round(tier.maxDenom && tier.maxDenom > 0 ? Math.max(tier.maxDenom, maxFromTrades || tier.maxDenom) : maxFromTrades || 2000)
    ),
  };
}

/**
 * Last successful USDT/USDC gift-card trades with partners who have contacts.
 * One row per card name + currency (most recent trade wins).
 * BTC trades are skipped: converting old satoshi amounts at today's BTC price inflates naira rates.
 */
export async function loadPartnerLastTradedRates(): Promise<PartnerLastRate[]> {
  const contacted = loadContactedPartnerUsernames();
  if (!contacted.size) {
    console.warn("Partner rate fallback: no contacted partners found in reports/");
    return [];
  }

  const cachePath = path.join(reportsDir(), ".extract-cache.json");
  if (!fs.existsSync(cachePath)) {
    console.warn("Partner rate fallback: missing reports/.extract-cache.json");
    return [];
  }

  let cache: { trades?: Record<string, unknown>[] };
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, "utf8")) as { trades?: Record<string, unknown>[] };
  } catch (err) {
    console.warn("Partner rate fallback: could not read extract cache:", (err as Error).message);
    return [];
  }

  const config = await getRateConfig();
  const ngnPerUsdt = config.rates.ngnPerUsdt;
  if (!(ngnPerUsdt > 0)) return [];

  const amountsByKey = new Map<string, number[]>();
  const best = new Map<string, PartnerLastRate>();

  for (const trade of cache.trades ?? []) {
    const partner = partnerOf(trade);
    if (!partner || !contacted.has(partner.toLowerCase())) continue;
    if (!isSuccessfulTrade(str(trade.status), str(trade.trade_status))) continue;

    const cardName = str(trade.payment_method_name || trade.payment_method_slug);
    const slug = str(trade.payment_method_slug);
    if (!cardName || !isGiftCardTrade(cardName, slug)) continue;

    const currency = str(trade.fiat_currency_code).toUpperCase();
    const fiat = num(trade.fiat_amount_requested ?? trade.fiat_amount);
    const cryptoCode = str(trade.crypto_currency_code).toUpperCase();
    const crypto = scaleCrypto(cryptoCode, num(trade.crypto_amount_requested ?? trade.crypto_amount ?? trade.crypto_amount_total));
    if (!currency || fiat <= 0 || crypto <= 0) continue;

    const nairaPerUnit = (crypto * ngnPerUsdt) / fiat;
    if (!(nairaPerUnit > 0) || nairaPerUnit > ngnPerUsdt * 1.5) continue;

    const key = `${canonicalCardSlug(cardName)}|${currency}`;
    const list = amountsByKey.get(key) ?? [];
    list.push(fiat);
    amountsByKey.set(key, list);

    const when = tradeTime(trade);
    const existing = best.get(key);
    if (existing && existing.tradedAt >= when) continue;

    const bounds = denomBounds(currency, list);
    const quotes: StoredQuotes = { NONE: nairaPerUnit, CASH: nairaPerUnit, DEBIT: nairaPerUnit };
    best.set(key, {
      cardName,
      currency,
      country: bounds.country,
      minDenom: bounds.minDenom,
      maxDenom: bounds.maxDenom,
      nairaPerUnit,
      storedQuotes: quotes,
      tradedAt: when,
      partner,
    });
  }

  for (const [key, rate] of best) {
    const amounts = amountsByKey.get(key) ?? [];
    const bounds = denomBounds(rate.currency, amounts);
    rate.minDenom = bounds.minDenom;
    rate.maxDenom = bounds.maxDenom;
    rate.country = bounds.country;
  }

  return [...best.values()];
}
