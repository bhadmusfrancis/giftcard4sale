import { ExchangeRates, RateReductions } from "@gc4s/shared";
import { prisma } from "../prisma";
import { env } from "../env";
import { getNoOnesSyncLimits, sleep } from "./noones/syncLimits";
import { noonesLinkedCardWhere } from "./noones/exclusions";

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
  return (await getCardRateStalenessInfo(cardTypeId, refreshHours)).stale;
}

async function getCardRateStalenessInfo(
  cardTypeId: string,
  refreshHours: number
): Promise<{ stale: boolean; oldestAt: number }> {
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

  if (!existingNoones.length && !currencyMetaRows.length) {
    return { stale: true, oldestAt: 0 };
  }

  const hasOpenEnded = existingNoones.some(
    (r) => r.active && r.minDenom == null && r.maxDenom == null && r.country !== "Other"
  );
  const activeNoones = existingNoones.filter((r) => r.active);
  if (!activeNoones.length) {
    const oldestAt = existingNoones.length
      ? Math.min(...existingNoones.map((r) => r.updatedAt.getTime()))
      : currencyMetaRows.length
        ? Math.min(...currencyMetaRows.map((m) => m.syncedAt.getTime()))
        : 0;
    return { stale: true, oldestAt };
  }

  const metaFresh =
    currencyMetaRows.length === 0 ||
    currencyMetaRows.every((m) => isRateSyncFresh(m.syncedAt, refreshHours));
  const ratesFresh = activeNoones.every((r) => isRateSyncFresh(r.updatedAt, refreshHours));
  const cardFullyFresh = !hasOpenEnded && metaFresh && ratesFresh;

  // Sort priority: oldest stale *component* (expired rate/meta), not newest display timestamp.
  let oldestAt = Infinity;
  for (const r of activeNoones) {
    if (!isRateSyncFresh(r.updatedAt, refreshHours)) {
      oldestAt = Math.min(oldestAt, r.updatedAt.getTime());
    }
  }
  for (const m of currencyMetaRows) {
    if (!isRateSyncFresh(m.syncedAt, refreshHours)) {
      oldestAt = Math.min(oldestAt, m.syncedAt.getTime());
    }
  }
  if (hasOpenEnded) {
    for (const r of activeNoones) {
      if (r.minDenom == null && r.maxDenom == null && r.country !== "Other") {
        oldestAt = Math.min(oldestAt, r.updatedAt.getTime());
      }
    }
  }
  if (oldestAt === Infinity) oldestAt = Date.now();

  return { stale: !cardFullyFresh, oldestAt };
}

/** Cards linked to NoOnes that need a refresh, oldest stale data first (not by popularity). */
export async function listStaleCardTypeIds(
  refreshHours: number
): Promise<{ id: string; name: string }[]> {
  const { staleCheckBatchSize, staleCheckPauseMs } = getNoOnesSyncLimits();

  const cards = await prisma.cardType.findMany({
    where: noonesLinkedCardWhere(),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const stale: { id: string; name: string; oldestAt: number }[] = [];
  for (let i = 0; i < cards.length; i += staleCheckBatchSize) {
    const batch = cards.slice(i, i + staleCheckBatchSize);
    for (const card of batch) {
      const info = await getCardRateStalenessInfo(card.id, refreshHours);
      if (info.stale) stale.push({ ...card, oldestAt: info.oldestAt });
    }
    if (i + staleCheckBatchSize < cards.length) await sleep(staleCheckPauseMs);
  }

  stale.sort((a, b) => a.oldestAt - b.oldestAt || a.name.localeCompare(b.name));
  return stale.map(({ id, name }) => ({ id, name }));
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
