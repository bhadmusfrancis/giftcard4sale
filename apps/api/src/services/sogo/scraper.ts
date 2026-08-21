import { StoredQuotes } from "@gc4s/shared";
import { env } from "../../env";
import { currencyTierFromCode } from "../noones/rateCatalog";

export const SOGO_RATE_SPEED = "SOGO";

export interface SogoCurrencyRate {
  currency: string;
  country: string;
  minDenom: number;
  maxDenom: number;
  physical?: { nairaPerUnit: number; storedQuotes: StoredQuotes };
  ecode?: { nairaPerUnit: number; storedQuotes: StoredQuotes };
}

export interface SogoCardRates {
  name: string;
  slugHint: string;
  currencies: SogoCurrencyRate[];
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; GiftCard4Sale/1.0; +https://giftcard4sale.com) rates-sync",
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseNaira(text: string): number | null {
  const nums = [...text.matchAll(/₦\s*([\d,]+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, "")));
  const valid = nums.filter((n) => Number.isFinite(n) && n > 0);
  return valid.length ? valid[0] : null;
}

function defaultMaxDenom(currency: string): number {
  switch (currency) {
    case "JPY":
      return 500_000;
    case "KRW":
      return 1_000_000;
    case "DKK":
    case "NOK":
    case "SEK":
      return 20_000;
    case "TRY":
      return 20_000;
    default:
      return 2_000;
  }
}

function denomBounds(currency: string): { minDenom: number; maxDenom: number; country: string } {
  const tier = currencyTierFromCode(currency);
  return {
    country: tier.country,
    minDenom: tier.minDenom && tier.minDenom > 0 ? tier.minDenom : 1,
    maxDenom: tier.maxDenom && tier.maxDenom > 0 ? tier.maxDenom : defaultMaxDenom(currency),
  };
}

function quoteKey(condition: string): keyof StoredQuotes | null {
  const c = condition.toLowerCase();
  if (!c) return null;
  if (/cash/.test(c)) return "CASH";
  if (/debit/.test(c)) return "DEBIT";
  if (/no\s*receipt/.test(c)) return "NONE";
  return null;
}

function isOrientationCondition(condition: string): boolean {
  return /vertical|horizontal/i.test(condition);
}

function uniformQuotes(naira: number): StoredQuotes {
  return { CASH: naira, DEBIT: naira, NONE: naira };
}

function finishQuotes(quotes: StoredQuotes): StoredQuotes | null {
  const values = [quotes.CASH, quotes.DEBIT, quotes.NONE].filter((n): n is number => n != null && n > 0);
  if (!values.length) return null;
  if (values.length === 1) return uniformQuotes(values[0]);
  return {
    CASH: quotes.CASH,
    DEBIT: quotes.DEBIT,
    NONE: quotes.NONE ?? quotes.DEBIT ?? quotes.CASH,
  };
}

function nairaFromQuotes(quotes: StoredQuotes): number {
  const values = [quotes.NONE, quotes.DEBIT, quotes.CASH].filter((n): n is number => n != null && n > 0);
  return values.length ? Math.min(...values) : 0;
}

function parseTableRows(tableHtml: string): Array<{ type: string; condition: string; naira: number }> {
  const hasCondition = /<th[^>]*>\s*Condition/i.test(tableHtml);
  const rows: Array<{ type: string; condition: string; naira: number }> = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let lastType = "";
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tableHtml))) {
    const row = tr[1];
    if (/<th\b/i.test(row)) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 2) continue;
    const type = cells[0] || lastType;
    const condition = hasCondition ? cells[1] || "" : "";
    const nairaText = hasCondition ? cells[2] || "" : cells[1] || "";
    const naira = parseNaira(nairaText);
    if (!type || naira == null) continue;
    lastType = type;
    rows.push({ type, condition, naira });
  }
  return rows;
}

function parseCurrencyBlock(blockHtml: string, heading: string): SogoCurrencyRate | null {
  const code = heading.match(/^([A-Z]{3})\b/)?.[1];
  if (!code) return null;
  const table = blockHtml.match(/<table\b[\s\S]*?<\/table>/i)?.[0];
  if (!table) return null;
  const rows = parseTableRows(table);
  if (!rows.length) return null;

  const physical: StoredQuotes = {};
  const ecode: StoredQuotes = {};
  const physicalOrientation: number[] = [];
  let sawPhysical = false;
  let sawEcode = false;

  for (const row of rows) {
    const isEcode = /ecode|e-?code|digital/i.test(row.type);
    if (isEcode) {
      sawEcode = true;
      const key = quoteKey(row.condition);
      if (key) ecode[key] = row.naira;
      else ecode.NONE = row.naira;
      continue;
    }
    if (!/physical/i.test(row.type)) continue;
    sawPhysical = true;
    if (isOrientationCondition(row.condition)) {
      physicalOrientation.push(row.naira);
      continue;
    }
    const key = quoteKey(row.condition);
    if (key) physical[key] = row.naira;
    else {
      physical.CASH = row.naira;
      physical.DEBIT = row.naira;
      physical.NONE = row.naira;
    }
  }

  const bounds = denomBounds(code);
  const out: SogoCurrencyRate = {
    currency: code,
    country: bounds.country,
    minDenom: bounds.minDenom,
    maxDenom: bounds.maxDenom,
  };

  if (sawPhysical) {
    const quotes =
      physicalOrientation.length > 0
        ? uniformQuotes(Math.min(...physicalOrientation))
        : finishQuotes(physical);
    if (quotes) out.physical = { nairaPerUnit: nairaFromQuotes(quotes), storedQuotes: quotes };
  }
  if (sawEcode) {
    const quotes = finishQuotes(ecode);
    if (quotes) out.ecode = { nairaPerUnit: nairaFromQuotes(quotes), storedQuotes: quotes };
  }

  if (!out.physical && !out.ecode) return null;
  return out;
}

function parseGcItem(itemHtml: string): SogoCardRates | null {
  const slugHint = itemHtml.match(/data-gc-name="([^"]+)"/i)?.[1]?.trim() || "";
  const name =
    stripTags(itemHtml.match(/<p class="font-semibold[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "") ||
    decodeEntities(slugHint);
  if (!name) return null;

  const body = itemHtml.match(/<div class="card-body\b[^"]*"[^>]*>([\s\S]*)$/i)?.[1] || itemHtml;
  const headerRe =
    /<p class="text-\[11px\] font-bold text-gray-400 uppercase tracking-widest mb-3">\s*([\s\S]*?)<\/p>/gi;
  const headers: { currencyLine: string; index: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headerRe.exec(body))) {
    headers.push({
      currencyLine: stripTags(match[1]),
      index: match.index,
      end: match.index + match[0].length,
    });
  }

  const currencies: SogoCurrencyRate[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].end;
    const stop = i + 1 < headers.length ? headers[i + 1].index : body.length;
    const parsed = parseCurrencyBlock(body.slice(start, stop), headers[i].currencyLine);
    if (!parsed || seen.has(parsed.currency)) continue;
    seen.add(parsed.currency);
    currencies.push(parsed);
  }

  if (!currencies.length) return null;
  return { name, slugHint, currencies };
}

/** Parse the public Sogo rates HTML into structured gift-card rates. */
export function parseSogoRatesHtml(html: string): SogoCardRates[] {
  const giftSection = html.match(/id="gift-cards"[\s\S]*?(?=<section\b[^>]*id="|$)/i)?.[0] ?? html;
  const items = giftSection.split(/<div class="gc-item\b/i).slice(1);
  const cards: SogoCardRates[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const parsed = parseGcItem(item);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(parsed);
  }
  return cards;
}

interface SogoApiCard {
  name?: string;
  slug?: string;
  currencies?: Array<{
    currency?: string;
    country?: string;
    physical?: { nairaPerUnit?: number; cash?: number; debit?: number; none?: number };
    ecode?: { nairaPerUnit?: number };
  }>;
}

function parseSogoApiPayload(raw: unknown): SogoCardRates[] | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { cards?: SogoApiCard[]; giftCards?: SogoApiCard[]; data?: { cards?: SogoApiCard[] } };
  const list = obj.cards ?? obj.giftCards ?? obj.data?.cards;
  if (!Array.isArray(list) || !list.length) return null;

  const cards: SogoCardRates[] = [];
  for (const card of list) {
    const name = String(card.name || card.slug || "").trim();
    if (!name) continue;
    const currencies: SogoCurrencyRate[] = [];
    for (const row of card.currencies ?? []) {
      const currency = String(row.currency || "").toUpperCase();
      if (!currency) continue;
      const bounds = denomBounds(currency);
      const physicalNaira = Number(row.physical?.nairaPerUnit ?? row.physical?.cash ?? 0);
      const ecodeNaira = Number(row.ecode?.nairaPerUnit ?? 0);
      const entry: SogoCurrencyRate = {
        currency,
        country: row.country?.trim() || bounds.country,
        minDenom: bounds.minDenom,
        maxDenom: bounds.maxDenom,
      };
      if (physicalNaira > 0) {
        const cash = Number(row.physical?.cash ?? physicalNaira);
        const debit = Number(row.physical?.debit ?? physicalNaira);
        const none = Number(row.physical?.none ?? physicalNaira);
        const quotes: StoredQuotes = { CASH: cash, DEBIT: debit, NONE: none };
        entry.physical = { nairaPerUnit: cash || physicalNaira, storedQuotes: quotes };
      }
      if (ecodeNaira > 0) {
        entry.ecode = {
          nairaPerUnit: ecodeNaira,
          storedQuotes: { NONE: ecodeNaira, CASH: ecodeNaira, DEBIT: ecodeNaira },
        };
      }
      if (entry.physical || entry.ecode) currencies.push(entry);
    }
    if (currencies.length) cards.push({ name, slugHint: String(card.slug || name), currencies });
  }
  return cards.length ? cards : null;
}

async function fetchText(url: string, acceptJson = false): Promise<string> {
  const res = await fetch(url, {
    headers: {
      ...FETCH_HEADERS,
      ...(acceptJson ? { Accept: "application/json" } : {}),
    },
  });
  if (!res.ok) throw new Error(`Sogo rates fetch failed (${res.status}) from ${url}`);
  return res.text();
}

/** Load live Sogo gift-card rates. Uses JSON API when configured; otherwise scrapes the public page. */
export async function fetchSogoGiftCardRates(): Promise<SogoCardRates[]> {
  if (env.sogo.apiUrl) {
    const body = await fetchText(env.sogo.apiUrl, true);
    try {
      const parsed = parseSogoApiPayload(JSON.parse(body));
      if (parsed?.length) return parsed;
    } catch (err) {
      throw new Error(`Sogo rates API parse failed: ${(err as Error).message}`);
    }
    throw new Error("Sogo rates API did not return gift-card rates");
  }

  const html = await fetchText(env.sogo.ratesUrl);
  const cards = parseSogoRatesHtml(html);
  if (!cards.length) throw new Error(`No gift-card rates parsed from ${env.sogo.ratesUrl}`);
  return cards;
}
