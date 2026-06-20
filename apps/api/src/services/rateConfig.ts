import { ExchangeRates, RateReductions } from "@gc4s/shared";
import { prisma } from "../prisma";
import { env } from "../env";
import { getNoOnesSyncLimits, sleep } from "./noones/syncLimits";
import { noonesLinkedCardWhere } from "./noones/exclusions";

const DEFAULT_NOONES_RATE_REFRESH_HOURS = 1;
const DEFAULT_NOONES_TOP_OFFERS_FOR_RATE = 3;
const DEFAULT_MIN_COUNTRY_OFFERS_FOR_DISPLAY = 5;

/** Order card types by catalog popularity (offer count, then trade volume). */
export const cardTypePopularityOrder = [
  { offerCount: "desc" as const },
  { tradeVolume: "desc" as const },
  { name: "asc" as const },
];

export async function getRateConfig(): Promise<{
  rates: ExchangeRates;
  reductions: RateReductions;
  referralPercent: number;
  noonesRateRefreshHours: number;
  noonesTopOffersForRate: number;
  minCountryOffersForDisplay: number;
}> {
  let cfg = await prisma.rateConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!cfg) {
    cfg = await prisma.rateConfig.create({
      data: {
        ngnPerUsdt: env.rates.ngnPerUsdt,
        ngnPerGhs: env.rates.ngnPerGhs,
        nairaReductionPercent: env.reductions.nairaReductionPercent,
        usdtReductionPercent: env.reductions.usdtReductionPercent,
        ghsReductionPercent: env.reductions.ghsReductionPercent,
        referralPercent: env.referralPercent,
        noonesRateRefreshHours: DEFAULT_NOONES_RATE_REFRESH_HOURS,
        noonesTopOffersForRate: DEFAULT_NOONES_TOP_OFFERS_FOR_RATE,
        minCountryOffersForDisplay: DEFAULT_MIN_COUNTRY_OFFERS_FOR_DISPLAY,
      },
    });
  }
  return {
    rates: {
      ngnPerUsdt: Number(cfg.ngnPerUsdt),
      ngnPerGhs: Number(cfg.ngnPerGhs),
    },
    reductions: {
      nairaReductionPercent: cfg.nairaReductionPercent,
      usdtReductionPercent: cfg.usdtReductionPercent,
      ghsReductionPercent: cfg.ghsReductionPercent,
    },
    referralPercent: cfg.referralPercent,
    noonesRateRefreshHours: cfg.noonesRateRefreshHours,
    noonesTopOffersForRate: cfg.noonesTopOffersForRate,
    minCountryOffersForDisplay: cfg.minCountryOffersForDisplay,
  };
}

/** True when a stored rate row was updated within the configured refresh window. */
export function isRateSyncFresh(updatedAt: Date, refreshHours: number): boolean {
  return Date.now() - updatedAt.getTime() < refreshHours * 3_600_000;
}

/** Ms until the next scheduled sync; 0 when refresh is overdue or no stored rates exist. */
export async function getRateSyncDelayMs(refreshHours: number): Promise<number> {
  const windowMs = refreshHours * 3_600_000;

  const latestRate = await prisma.rate.findFirst({
    where: { speed: "NOONES" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  const latestMeta = await prisma.cardCurrencyMeta.findFirst({
    orderBy: { syncedAt: "desc" },
    select: { syncedAt: true },
  });

  let latest = 0;
  if (latestRate) latest = Math.max(latest, latestRate.updatedAt.getTime());
  if (latestMeta) latest = Math.max(latest, latestMeta.syncedAt.getTime());

  if (!latest) return 0;

  return Math.max(0, latest + windowMs - Date.now());
}

export interface RateFreshnessMeta {
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  refreshHours: number;
  isStale: boolean;
}

/** True when a card's stored NoOnes rates or currency meta are missing or past the refresh window. */
export async function isCardRateDataStale(
  cardTypeId: string,
  refreshHours: number
): Promise<boolean> {
  const [existingNoones, currencyMetaRows] = await Promise.all([
    prisma.rate.findMany({
      where: { cardTypeId, speed: "NOONES" },
      select: { updatedAt: true, minDenom: true, maxDenom: true, active: true, country: true },
    }),
    prisma.cardCurrencyMeta.findMany({
      where: { cardTypeId },
      select: { syncedAt: true },
    }),
  ]);

  if (!existingNoones.length && !currencyMetaRows.length) return true;

  const hasOpenEnded = existingNoones.some(
    (r) => r.active && r.minDenom == null && r.maxDenom == null && r.country !== "Other"
  );
  const activeNoones = existingNoones.filter((r) => r.active);
  if (!activeNoones.length) return true;

  const metaFresh =
    currencyMetaRows.length > 0 &&
    currencyMetaRows.every((m) => isRateSyncFresh(m.syncedAt, refreshHours));
  const cardFullyFresh =
    !hasOpenEnded &&
    metaFresh &&
    activeNoones.every((r) => isRateSyncFresh(r.updatedAt, refreshHours));

  return !cardFullyFresh;
}

/** Cards linked to NoOnes that need a refresh (checked in small batches). */
export async function listStaleCardTypeIds(
  refreshHours: number
): Promise<{ id: string; name: string }[]> {
  const { staleCheckBatchSize, staleCheckPauseMs } = getNoOnesSyncLimits();

  const cards = await prisma.cardType.findMany({
    where: noonesLinkedCardWhere(),
    select: { id: true, name: true },
    orderBy: cardTypePopularityOrder,
  });

  const stale: { id: string; name: string }[] = [];
  for (let i = 0; i < cards.length; i += staleCheckBatchSize) {
    const batch = cards.slice(i, i + staleCheckBatchSize);
    for (const card of batch) {
      if (await isCardRateDataStale(card.id, refreshHours)) stale.push(card);
    }
    if (i + staleCheckBatchSize < cards.length) await sleep(staleCheckPauseMs);
  }
  return stale;
}

/** Build user-facing rate freshness from stored rate rows (no live API calls). */
export function buildRateFreshnessMeta(
  rates: { updatedAt: Date; speed?: string | null }[],
  refreshHours: number
): RateFreshnessMeta {
  const noonesRates = rates.filter((r) => r.speed === "NOONES");
  const source = noonesRates.length ? noonesRates : rates;

  let latest = 0;
  for (const rate of source) {
    const ts = rate.updatedAt.getTime();
    if (ts > latest) latest = ts;
  }

  if (!latest || !Number.isFinite(latest)) {
    return {
      lastUpdatedAt: null,
      nextRefreshAt: null,
      refreshHours,
      isStale: true,
    };
  }

  const next = latest + refreshHours * 3_600_000;
  return {
    lastUpdatedAt: new Date(latest).toISOString(),
    nextRefreshAt: new Date(next).toISOString(),
    refreshHours,
    isStale: Date.now() >= next,
  };
}
