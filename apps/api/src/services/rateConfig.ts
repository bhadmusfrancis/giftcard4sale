import { ExchangeRates, RateReductions } from "@gc4s/shared";
import { prisma } from "../prisma";
import { env } from "../env";

const DEFAULT_NOONES_RATE_REFRESH_MINUTES = 15;
const DEFAULT_NOONES_TOP_OFFERS_FOR_RATE = 3;
const DEFAULT_MIN_COUNTRY_OFFERS_FOR_DISPLAY = 5;

export async function getRateConfig(): Promise<{
  rates: ExchangeRates;
  reductions: RateReductions;
  referralPercent: number;
  noonesRateRefreshMinutes: number;
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
        fxReductionPercent: env.reductions.fxReductionPercent,
        referralPercent: env.referralPercent,
        noonesRateRefreshMinutes: DEFAULT_NOONES_RATE_REFRESH_MINUTES,
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
      fxReductionPercent: cfg.fxReductionPercent,
    },
    referralPercent: cfg.referralPercent,
    noonesRateRefreshMinutes: cfg.noonesRateRefreshMinutes,
    noonesTopOffersForRate: cfg.noonesTopOffersForRate,
    minCountryOffersForDisplay: cfg.minCountryOffersForDisplay,
  };
}

/** True when a stored rate row was updated within the configured refresh window. */
export function isRateSyncFresh(updatedAt: Date, refreshMinutes: number): boolean {
  return Date.now() - updatedAt.getTime() < refreshMinutes * 60_000;
}

/** Ms until the next scheduled sync; 0 when refresh is overdue or no stored rates exist. */
export async function getRateSyncDelayMs(refreshMinutes: number): Promise<number> {
  const windowMs = refreshMinutes * 60_000;

  const [latestRate, latestMeta] = await Promise.all([
    prisma.rate.findFirst({
      where: { speed: "NOONES" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.cardCurrencyMeta.findFirst({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    }),
  ]);

  let latest = 0;
  if (latestRate) latest = Math.max(latest, latestRate.updatedAt.getTime());
  if (latestMeta) latest = Math.max(latest, latestMeta.syncedAt.getTime());

  if (!latest) return 0;

  return Math.max(0, latest + windowMs - Date.now());
}

export interface RateFreshnessMeta {
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  refreshMinutes: number;
  isStale: boolean;
}

/** Build user-facing rate freshness from stored rate rows (no live API calls). */
export function buildRateFreshnessMeta(
  rates: { updatedAt: Date; speed?: string | null }[],
  refreshMinutes: number
): RateFreshnessMeta {
  const noonesRates = rates.filter((r) => r.speed === "NOONES");
  const source = noonesRates.length ? noonesRates : rates;

  let latest = 0;
  for (const rate of source) {
    const ts = rate.updatedAt.getTime();
    if (ts > latest) latest = ts;
  }

  if (!latest) {
    return {
      lastUpdatedAt: null,
      nextRefreshAt: null,
      refreshMinutes,
      isStale: true,
    };
  }

  const next = latest + refreshMinutes * 60_000;
  return {
    lastUpdatedAt: new Date(latest).toISOString(),
    nextRefreshAt: new Date(next).toISOString(),
    refreshMinutes,
    isStale: Date.now() >= next,
  };
}
