import { CardMedium, RateEntry } from "./types";

export interface ParseResult {
  entries: RateEntry[];
  warnings: string[];
}

// Map a country / region token to the card's face currency.
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  USA: "USD",
  UK: "GBP",
  GBP: "GBP",
  EUR: "EUR",
  EURO: "EUR",
  GERMANY: "EUR",
  FINLAND: "EUR",
  NETHERLANDS: "EUR",
  FRANCE: "EUR",
  SPAIN: "EUR",
  AUSTRIA: "EUR",
  BELGIUM: "EUR",
  IRELAND: "EUR",
  ITALY: "EUR",
  CHF: "CHF",
  SWITZERLAND: "CHF",
  CAD: "CAD",
  CANADA: "CAD",
  AUD: "AUD",
  AUSTRALIA: "AUD",
  NZD: "NZD",
  SGP: "SGD",
  SINGAPORE: "SGD",
  BRAZIL: "BRL",
  MALAYSIA: "MYR",
  PLN: "PLN",
  POLAND: "PLN",
  OTHER: "USD",
};

function currencyForCountry(country: string): string {
  const key = country.trim().toUpperCase();
  if (COUNTRY_CURRENCY[key]) return COUNTRY_CURRENCY[key];
  // Heuristics for descriptive labels.
  if (key.includes("OTHER")) return "USD";
  return "USD";
}

function normalizeCountry(label: string): string {
  const l = label.trim();
  if (/other/i.test(l)) return "Other";
  return l;
}

// Pull the card type name out of a 【...】 marker.
function extractBracketType(line: string): string | null {
  const m = line.match(/【([^】]+)】/);
  if (!m) return null;
  return m[1].trim();
}

// Strip trailing id-like number groups, e.g. "Gamestop 6364911" -> "Gamestop".
function cleanCardType(name: string): string {
  return name.replace(/\s+\d{4,}\s*$/, "").trim();
}

function parseDenoms(line: string): { min: number | null; max: number | null } {
  const paren = line.match(/\(([^)]*)\)/);
  if (!paren) return { min: null, max: null };
  const inside = paren[1];
  // Ignore "in 5s" / "in 100s" style hints; only look at the leading number group.
  const nums = (inside.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  // Drop the "step" value that follows "in" (e.g. "in 100s").
  const inMatch = inside.match(/in\s+(\d+)/i);
  let values = nums;
  if (inMatch) {
    const step = Number(inMatch[1]);
    // remove the last occurrence equal to step (the "in Ns" value)
    const idx = values.lastIndexOf(step);
    if (idx !== -1) values = values.filter((_, i) => i !== idx);
  }
  if (values.length === 0) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function parseRate(line: string): number | null {
  // last "= <number>" on the line
  const matches = [...line.matchAll(/=\s*([\d][\d,]*(?:\.\d+)?)/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1][1].replace(/,/g, "");
  const n = Number(last);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const HEADER_SPEED = /\b(SLOW|FAST)\b/i;

/**
 * Parse a pasted rate text (Naira format) into structured rate entries.
 * Returns one entry per (cardType, country, denom range, medium).
 * When the same key exists as both SLOW and FAST, the SLOW entry is kept.
 */
export function parseRateText(text: string): ParseResult {
  const warnings: string[] = [];
  const raw: RateEntry[] = [];

  let currentType = "Unknown";
  let currentSpeed: "SLOW" | "FAST" | undefined;

  const lines = text.split(/\r?\n/);

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;

    const hasBracket = /【[^】]+】/.test(line);
    const isBullet = line.startsWith("●") || line.startsWith("•") || line.startsWith("*");
    const rate = parseRate(line);

    // Header line: has 【type】 but no numeric rate -> sets the current card type.
    if (hasBracket && !(isBullet && rate)) {
      const type = extractBracketType(line);
      if (type) {
        currentType = cleanCardType(type);
        const speedMatch = line.match(HEADER_SPEED);
        currentSpeed = speedMatch ? (speedMatch[1].toUpperCase() as "SLOW" | "FAST") : undefined;
      }
      continue;
    }

    // Not a value line.
    if (!rate) continue;

    // Inline entry like "●【Chime mail】(100-1000) = 1179"
    if (hasBracket && isBullet) {
      const type = cleanCardType(extractBracketType(line) || currentType);
      const { min, max } = parseDenoms(line);
      raw.push({
        cardType: type,
        country: "US",
        currency: "USD",
        minDenom: min,
        maxDenom: max,
        medium: /\bcode\b/i.test(line) ? "ECODE" : "PHYSICAL",
        nairaPerUnit: rate,
        speed: undefined,
        note: "auto-parsed inline brand",
      });
      continue;
    }

    // Standard value line: "● US (200-500 in 100s) = 1092"
    // Country/label is everything between the bullet and the first "(" or "=".
    const body = line.replace(/^[●•*]\s*/, "");
    const labelPart = body.split(/[(=]/)[0].trim();
    const medium: CardMedium = /\bcode\b/i.test(labelPart) || /\bcode\b/i.test(line) ? "ECODE" : "PHYSICAL";
    const country = normalizeCountry(labelPart.replace(/\bcode\b/i, "").trim() || "US");
    const { min, max } = parseDenoms(line);

    raw.push({
      cardType: currentType,
      country: country || "US",
      currency: currencyForCountry(country),
      minDenom: min,
      maxDenom: max,
      medium,
      nairaPerUnit: rate,
      speed: currentSpeed,
    });
  }

  // Dedup: for the same (type, country, medium, min, max) prefer SLOW over FAST.
  const map = new Map<string, RateEntry>();
  for (const e of raw) {
    const key = [e.cardType.toLowerCase(), e.country.toLowerCase(), e.medium, e.minDenom, e.maxDenom].join("|");
    const existing = map.get(key);
    if (!existing) {
      map.set(key, e);
      continue;
    }
    // Prefer SLOW.
    const existingIsSlow = existing.speed === "SLOW";
    const incomingIsSlow = e.speed === "SLOW";
    if (incomingIsSlow && !existingIsSlow) {
      map.set(key, e);
      warnings.push(`Replaced FAST with SLOW for ${e.cardType} ${e.country}`);
    }
  }

  return { entries: [...map.values()], warnings };
}
