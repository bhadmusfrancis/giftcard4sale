import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import type { CurrencyOfferMeta, OfferDenomRange } from "./offers";

export interface StoredDenomRange {
  min: number;
  max: number;
}

export function denomRangesToJson(ranges: OfferDenomRange[]): Prisma.InputJsonValue {
  return ranges.map((r) => ({ min: r.min, max: r.max }));
}

export function parseStoredDenomRanges(raw: unknown): StoredDenomRange[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredDenomRange[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const min = Number((item as { min?: unknown }).min);
    const max = Number((item as { max?: unknown }).max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) continue;
    out.push({ min: Math.round(min), max: Math.round(max) });
  }
  return out.sort((a, b) => a.min - b.min || a.max - b.max);
}

function mergeDenomRanges(...sources: StoredDenomRange[][]): StoredDenomRange[] {
  const map = new Map<string, StoredDenomRange>();
  for (const ranges of sources) {
    for (const r of ranges) {
      map.set(`${r.min}|${r.max}`, r);
    }
  }
  return [...map.values()].sort((a, b) => a.min - b.min || a.max - b.max);
}

function rangesFromRateRow(minDenom: number | null, maxDenom: number | null): StoredDenomRange[] {
  if (minDenom == null && maxDenom == null) return [];
  const min = minDenom ?? maxDenom!;
  const max = maxDenom ?? minDenom!;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return [];
  return [{ min: Math.round(min), max: Math.round(max) }];
}

export async function persistCardCurrencyMeta(
  cardTypeId: string,
  country: string,
  currency: string,
  meta: CurrencyOfferMeta
): Promise<void> {
  const denomRanges = denomRangesToJson(meta.ranges);
  await prisma.cardCurrencyMeta.upsert({
    where: { cardTypeId_currency: { cardTypeId, currency } },
    create: {
      cardTypeId,
      country,
      currency,
      offerCount: meta.offerCount,
      denomRanges,
      syncedAt: new Date(),
    },
    update: {
      country,
      offerCount: meta.offerCount,
      denomRanges,
      syncedAt: new Date(),
    },
  });
}

export async function listCardCurrencyMeta(cardTypeId: string) {
  const rows = await prisma.cardCurrencyMeta.findMany({
    where: { cardTypeId },
    orderBy: [{ offerCount: "desc" }, { currency: "asc" }],
  });
  return rows.map((row) => ({
    country: row.country,
    currency: row.currency,
    offerCount: row.offerCount,
    denomRanges: parseStoredDenomRanges(row.denomRanges),
    syncedAt: row.syncedAt.toISOString(),
  }));
}

/** Currency metadata for the card page — merges stored NoOnes meta with bounded rate rows. */
export async function listCardCurrencyMetaForDisplay(cardTypeId: string) {
  const [stored, rates] = await Promise.all([
    prisma.cardCurrencyMeta.findMany({
      where: { cardTypeId },
      orderBy: [{ offerCount: "desc" }, { currency: "asc" }],
    }),
    prisma.rate.findMany({
      where: {
        cardTypeId,
        speed: "NOONES",
        OR: [{ minDenom: { not: null } }, { maxDenom: { not: null } }],
      },
      select: {
        country: true,
        currency: true,
        minDenom: true,
        maxDenom: true,
        countryOfferCount: true,
      },
    }),
  ]);

  const byCurrency = new Map<
    string,
    {
      country: string;
      currency: string;
      offerCount: number;
      denomRanges: StoredDenomRange[];
      syncedAt: string;
    }
  >();

  for (const row of stored) {
    byCurrency.set(row.currency, {
      country: row.country,
      currency: row.currency,
      offerCount: row.offerCount,
      denomRanges: parseStoredDenomRanges(row.denomRanges),
      syncedAt: row.syncedAt.toISOString(),
    });
  }

  for (const rate of rates) {
    const fromRate = rangesFromRateRow(rate.minDenom, rate.maxDenom);
    if (!fromRate.length) continue;

    const existing = byCurrency.get(rate.currency);
    if (existing) {
      existing.denomRanges = mergeDenomRanges(existing.denomRanges, fromRate);
      if (rate.countryOfferCount && rate.countryOfferCount > existing.offerCount) {
        existing.offerCount = rate.countryOfferCount;
      }
      if (existing.country !== rate.country) existing.country = rate.country;
    } else {
      byCurrency.set(rate.currency, {
        country: rate.country,
        currency: rate.currency,
        offerCount: rate.countryOfferCount ?? 0,
        denomRanges: fromRate,
        syncedAt: new Date(0).toISOString(),
      });
    }
  }

  return [...byCurrency.values()].sort(
    (a, b) => b.offerCount - a.offerCount || a.currency.localeCompare(b.currency)
  );
}
