import { ExchangeRates, RateReductions } from "@gc4s/shared";
import { prisma } from "../prisma";
import { env } from "../env";
import { isOpenEndedCountryTier } from "./noones/rateCatalog";
import { SYNCED_RATE_SPEEDS } from "./rateSources";

const DEFAULT_NOONES_RATE_REFRESH_HOURS = 1;
const DEFAULT_NOONES_TOP_OFFERS_FOR_RATE = 3;
const DEFAULT_MIN_COUNTRY_OFFERS_FOR_DISPLAY = 5;
const DEFAULT_MIN_WITHDRAWAL_NGN = 5000;
const DEFAULT_MIN_WITHDRAWAL_GHS = 50;
const DEFAULT_MIN_WITHDRAWAL_USDT = 5;

export type WithdrawalCurrency = "USDT" | "NGN" | "GHS";

export type PlatformConfig = Awaited<ReturnType<typeof getRateConfig>>;

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
  defaultMaxConcurrentTrades: number;
  autoSuspendRejectThreshold: number;
  autoSuspendRejectWindowDays: number;
  autoSuspendDurationDays: number;
  minWithdrawals: Record<WithdrawalCurrency, number>;
  noonesAutoResellEnabled: boolean;
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
        defaultMaxConcurrentTrades: 5,
        autoSuspendRejectThreshold: 5,
        autoSuspendRejectWindowDays: 30,
        autoSuspendDurationDays: 7,
        minWithdrawalNgn: DEFAULT_MIN_WITHDRAWAL_NGN,
        minWithdrawalGhs: DEFAULT_MIN_WITHDRAWAL_GHS,
        minWithdrawalUsdt: DEFAULT_MIN_WITHDRAWAL_USDT,
        noonesAutoResellEnabled: true,
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
    defaultMaxConcurrentTrades: cfg.defaultMaxConcurrentTrades,
    autoSuspendRejectThreshold: cfg.autoSuspendRejectThreshold,
    autoSuspendRejectWindowDays: cfg.autoSuspendRejectWindowDays,
    autoSuspendDurationDays: cfg.autoSuspendDurationDays,
    minWithdrawals: {
      NGN: Number(cfg.minWithdrawalNgn),
      GHS: Number(cfg.minWithdrawalGhs),
      USDT: Number(cfg.minWithdrawalUsdt),
    },
    noonesAutoResellEnabled: cfg.noonesAutoResellEnabled,
  };
}

export function minWithdrawalForCurrency(
  currency: WithdrawalCurrency,
  config: Pick<PlatformConfig, "minWithdrawals">
): number {
  return config.minWithdrawals[currency];
}

/** True when a stored rate row was updated within the configured refresh window. */
export function isRateSyncFresh(updatedAt: Date, refreshHours: number): boolean {
  return Date.now() - updatedAt.getTime() < refreshHours * 3_600_000;
}

export interface RateFreshnessMeta {
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  refreshHours: number;
  isStale: boolean;
}

/** True when a card's stored rates or currency meta are missing or past the refresh window. */
export async function isCardRateDataStale(
  cardTypeId: string,
  refreshHours: number,
  lastSyncAt?: Date | null
): Promise<boolean> {
  return (await getCardRateStalenessInfo(cardTypeId, refreshHours, lastSyncAt)).stale;
}

/**
 * Staleness of one card's stored rates.
 *
 * `lastSyncAt` is when the catalog last finished a sync. A source that drops a
 * card leaves its rows untouched, so a card counts as fresh while syncs are
 * still completing on schedule.
 */
export async function getCardRateStalenessInfo(
  cardTypeId: string,
  refreshHours: number,
  lastSyncAt?: Date | null
): Promise<{ stale: boolean; oldestAt: number }> {
  const [syncedRates, currencyMetaRows] = await Promise.all([
    prisma.rate.findMany({
      where: { cardTypeId, speed: { in: SYNCED_RATE_SPEEDS } },
      select: {
        updatedAt: true,
        minDenom: true,
        maxDenom: true,
        active: true,
        country: true,
        currency: true,
      },
    }),
    prisma.cardCurrencyMeta.findMany({
      where: { cardTypeId },
      select: { currency: true, syncedAt: true },
    }),
  ]);

  const syncedRecently = lastSyncAt != null && isRateSyncFresh(lastSyncAt, refreshHours);
  const lastSyncMs = lastSyncAt?.getTime() ?? 0;

  if (!syncedRates.length && !currencyMetaRows.length) {
    if (syncedRecently) return { stale: false, oldestAt: lastSyncMs };
    return { stale: true, oldestAt: 0 };
  }

  const hasOpenEnded = syncedRates.some(
    (r) =>
      r.active &&
      r.minDenom == null &&
      r.maxDenom == null &&
      !isOpenEndedCountryTier(r.country)
  );
  const activeRates = syncedRates.filter((r) => r.active);
  if (!activeRates.length) {
    if (syncedRecently) return { stale: false, oldestAt: lastSyncMs };
    const oldestAt = syncedRates.length
      ? Math.min(...syncedRates.map((r) => r.updatedAt.getTime()))
      : currencyMetaRows.length
        ? Math.min(...currencyMetaRows.map((m) => m.syncedAt.getTime()))
        : 0;
    return { stale: true, oldestAt };
  }

  const activeCurrencies = [...new Set(activeRates.map((r) => r.currency))];
  const metaByCurrency = new Map(currencyMetaRows.map((m) => [m.currency, m]));
  const metaFresh =
    activeCurrencies.length === 0 ||
    activeCurrencies.every((currency) => {
      const meta = metaByCurrency.get(currency);
      return meta != null && isRateSyncFresh(meta.syncedAt, refreshHours);
    });
  const ratesFresh = activeRates.every((r) => isRateSyncFresh(r.updatedAt, refreshHours));
  const cardFullyFresh = !hasOpenEnded && metaFresh && ratesFresh;

  // Sort priority: oldest stale *component* (expired rate/meta), not newest display timestamp.
  let oldestAt = Infinity;
  for (const r of activeRates) {
    if (!isRateSyncFresh(r.updatedAt, refreshHours)) {
      oldestAt = Math.min(oldestAt, r.updatedAt.getTime());
    }
  }
  for (const currency of activeCurrencies) {
    const meta = metaByCurrency.get(currency);
    if (meta && !isRateSyncFresh(meta.syncedAt, refreshHours)) {
      oldestAt = Math.min(oldestAt, meta.syncedAt.getTime());
    }
  }
  if (hasOpenEnded) {
    for (const r of activeRates) {
      if (
        r.minDenom == null &&
        r.maxDenom == null &&
        !isOpenEndedCountryTier(r.country)
      ) {
        oldestAt = Math.min(oldestAt, r.updatedAt.getTime());
      }
    }
  }
  if (oldestAt === Infinity) oldestAt = Date.now();

  if (cardFullyFresh) {
    return { stale: false, oldestAt };
  }

  if (syncedRecently) {
    return { stale: false, oldestAt: lastSyncMs };
  }

  return { stale: true, oldestAt };
}

/**
 * User-facing rate freshness, from stored rows only (no live API calls).
 *
 * `lastSyncAt` is when the catalog last finished a sync. It suppresses the
 * "rate may be outdated" notice while syncs keep completing: a source can stop
 * listing a card without its rate being wrong, and a warning the site cannot
 * clear by syncing is just noise.
 */
export function buildRateFreshnessMeta(
  rates: { updatedAt: Date; speed?: string | null }[],
  refreshHours: number,
  lastSyncAt?: Date | null
): RateFreshnessMeta {
  const preferred = rates.filter((r) => r.speed && SYNCED_RATE_SPEEDS.includes(r.speed));
  const source = preferred.length ? preferred : rates;

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

  const windowMs = refreshHours * 3_600_000;
  const freshUntilFrom = Math.max(latest, lastSyncAt?.getTime() ?? 0);
  const next = freshUntilFrom + windowMs;

  return {
    lastUpdatedAt: new Date(latest).toISOString(),
    nextRefreshAt: new Date(next).toISOString(),
    refreshHours,
    isStale: Date.now() >= next,
  };
}
