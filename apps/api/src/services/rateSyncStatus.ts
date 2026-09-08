import { prisma } from "../prisma";
import { getRateConfig, isCardRateDataStale, isRateSyncFresh } from "./rateConfig";
import { SYNCED_RATE_SPEEDS } from "./rateSources";
import { getLastRateSyncAt } from "./rateSyncState";
import { emptyRateSyncSummary, type RateSyncSummary } from "./rateTypes";

export type RateSyncPhase = "idle" | "discovering" | "syncing" | "completed" | "failed";
export type RateSyncScope = "full" | "card";
export type RateSyncTrigger = "admin" | "cli" | "cron";

export interface RateSyncProgress {
  running: boolean;
  phase: RateSyncPhase;
  scope: RateSyncScope | null;
  trigger: RateSyncTrigger | null;
  force: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  elapsedMs: number;
  cardTypeId: string | null;
  currentCard: { id: string; name: string } | null;
  processedCards: number;
  totalCards: number;
  progressPercent: number | null;
  summary: RateSyncSummary;
  recentErrors: string[];
  lastError: string | null;
}

export interface RateSyncDbStats {
  cards: number;
  rateRows: number;
  activeRates: number;
  latestRateUpdate: string | null;
  /** Last sync that wrote rows, from the database, so it survives restarts. */
  lastSuccessfulSyncAt: string | null;
  staleCards: number;
  refreshHours: number;
}

export interface RateSyncStatusResponse {
  configured: boolean;
  active: RateSyncProgress;
  lastCompleted: RateSyncProgress | null;
  database: RateSyncDbStats;
}

function idleProgress(): RateSyncProgress {
  return {
    running: false,
    phase: "idle",
    scope: null,
    trigger: null,
    force: false,
    startedAt: null,
    finishedAt: null,
    elapsedMs: 0,
    cardTypeId: null,
    currentCard: null,
    processedCards: 0,
    totalCards: 0,
    progressPercent: null,
    summary: emptyRateSyncSummary(),
    recentErrors: [],
    lastError: null,
  };
}

let active: RateSyncProgress = idleProgress();
let lastCompleted: RateSyncProgress | null = null;

const MAX_RECENT_ERRORS = 30;
const DB_STATS_TTL_MS = 60_000;

let cachedDbStats: RateSyncDbStats | null = null;
let cachedDbStatsAt = 0;
let dbStatsInFlight: Promise<RateSyncDbStats> | null = null;

function snapshot(p: RateSyncProgress): RateSyncProgress {
  return {
    ...p,
    summary: { ...p.summary, errors: [...p.summary.errors] },
    recentErrors: [...p.recentErrors],
    currentCard: p.currentCard ? { ...p.currentCard } : null,
    elapsedMs: p.startedAt ? Date.now() - new Date(p.startedAt).getTime() : 0,
    progressPercent:
      p.totalCards > 0 ? Math.min(100, Math.round((p.processedCards / p.totalCards) * 100)) : null,
  };
}

export function isRateSyncActive(): boolean {
  return active.running;
}

export function tryStartRateSyncRun(params: {
  scope: RateSyncScope;
  force?: boolean;
  trigger: RateSyncTrigger;
  cardTypeId?: string;
  cardName?: string;
  totalCards?: number;
}): boolean {
  if (active.running) return false;

  active = {
    running: true,
    phase: "discovering",
    scope: params.scope,
    trigger: params.trigger,
    force: Boolean(params.force),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    elapsedMs: 0,
    cardTypeId: params.cardTypeId ?? null,
    currentCard:
      params.cardTypeId && params.cardName
        ? { id: params.cardTypeId, name: params.cardName }
        : null,
    processedCards: 0,
    totalCards: params.totalCards ?? (params.scope === "card" ? 1 : 0),
    progressPercent: null,
    summary: emptyRateSyncSummary(),
    recentErrors: [],
    lastError: null,
  };
  if (!cachedDbStats) {
    void getRateSyncDbStats().catch(() => {});
  }
  return true;
}

export function setRateSyncPhase(phase: RateSyncPhase): void {
  if (!active.running) return;
  active.phase = phase;
}

export function setRateSyncTotalCards(total: number): void {
  if (!active.running) return;
  active.totalCards = total;
}

export function setRateSyncCurrentCard(card: { id: string; name: string }, processed: number): void {
  if (!active.running) return;
  active.phase = "syncing";
  active.currentCard = card;
  active.processedCards = processed;
}

export function mergeRateSyncSummary(partial: Partial<RateSyncSummary>): void {
  if (!active.running) return;
  const s = active.summary;
  if (partial.created != null) s.created = partial.created;
  if (partial.updated != null) s.updated = partial.updated;
  if (partial.skipped != null) s.skipped = partial.skipped;
  if (partial.drafted != null) s.drafted = partial.drafted;
  if (partial.published != null) s.published = partial.published;
  if (partial.cardTypes != null) s.cardTypes = partial.cardTypes;
}

export function addRateSyncErrors(errors: string[]): void {
  if (!active.running || !errors.length) return;
  active.summary.errors.push(...errors);
  for (const err of errors) {
    active.lastError = err;
    active.recentErrors.push(err);
  }
  if (active.recentErrors.length > MAX_RECENT_ERRORS) {
    active.recentErrors = active.recentErrors.slice(-MAX_RECENT_ERRORS);
  }
}

export function completeRateSyncRun(summary: RateSyncSummary): void {
  if (!active.running) return;
  active.running = false;
  active.phase = "completed";
  active.finishedAt = new Date().toISOString();
  active.summary = { ...summary, errors: [...summary.errors] };
  active.processedCards = active.totalCards || active.processedCards;
  active.currentCard = null;
  lastCompleted = snapshot(active);
  active = idleProgress();
  cachedDbStatsAt = 0;
}

export function failRateSyncRun(message: string): void {
  if (!active.running) {
    lastCompleted = {
      ...idleProgress(),
      phase: "failed",
      finishedAt: new Date().toISOString(),
      lastError: message,
      recentErrors: [message],
      summary: { ...emptyRateSyncSummary(), errors: [message] },
    };
    cachedDbStatsAt = 0;
    return;
  }
  active.running = false;
  active.phase = "failed";
  active.finishedAt = new Date().toISOString();
  active.lastError = message;
  addRateSyncErrors([message]);
  lastCompleted = snapshot(active);
  active = idleProgress();
  cachedDbStatsAt = 0;
}

export function getRateSyncProgress(): RateSyncProgress {
  return snapshot(active);
}

export async function getRateSyncDbStats(options?: { force?: boolean }): Promise<RateSyncDbStats> {
  const now = Date.now();

  if (isRateSyncActive() && cachedDbStats && !options?.force) {
    return cachedDbStats;
  }

  if (!options?.force && cachedDbStats && now - cachedDbStatsAt < DB_STATS_TTL_MS) {
    return cachedDbStats;
  }

  if (dbStatsInFlight && !options?.force) {
    return dbStatsInFlight;
  }

  dbStatsInFlight = (async () => {
    try {
      const config = await getRateConfig();
      const refreshHours = config.noonesRateRefreshHours;
      const lastSyncAt = await getLastRateSyncAt();

      const cards = await prisma.cardType.count({
        where: { rates: { some: { speed: { in: SYNCED_RATE_SPEEDS } } } },
      });
      const rateRows = await prisma.rate.count({ where: { speed: { in: SYNCED_RATE_SPEEDS } } });
      const activeRates = await prisma.rate.count({
        where: { speed: { in: SYNCED_RATE_SPEEDS }, active: true },
      });
      const latestRate = await prisma.rate.findFirst({
        where: { speed: { in: SYNCED_RATE_SPEEDS } },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      });

      // A sync inside the refresh window makes every card fresh by definition,
      // so skip the per-card checks entirely rather than query for each one.
      const syncedRecently = lastSyncAt != null && isRateSyncFresh(lastSyncAt, refreshHours);
      let staleCards = 0;
      if (!isRateSyncActive() && !syncedRecently) {
        const syncedCards = await prisma.cardType.findMany({
          where: { rates: { some: { speed: { in: SYNCED_RATE_SPEEDS } } } },
          select: { id: true },
        });
        for (const c of syncedCards) {
          if (await isCardRateDataStale(c.id, refreshHours, lastSyncAt)) staleCards++;
        }
      }

      const stats: RateSyncDbStats = {
        cards,
        rateRows,
        activeRates,
        latestRateUpdate: latestRate?.updatedAt.toISOString() ?? null,
        lastSuccessfulSyncAt: lastSyncAt?.toISOString() ?? null,
        staleCards,
        refreshHours,
      };

      cachedDbStats = stats;
      cachedDbStatsAt = Date.now();
      return stats;
    } finally {
      dbStatsInFlight = null;
    }
  })();

  return dbStatsInFlight;
}

export async function getRateSyncStatusResponse(
  configured: boolean,
  options?: { skipDb?: boolean }
): Promise<RateSyncStatusResponse> {
  const database =
    options?.skipDb && cachedDbStats
      ? cachedDbStats
      : options?.skipDb && isRateSyncActive()
        ? cachedDbStats ?? {
            cards: 0,
            rateRows: 0,
            activeRates: 0,
            latestRateUpdate: null,
            lastSuccessfulSyncAt: null,
            staleCards: 0,
            refreshHours: 1,
          }
        : await getRateSyncDbStats({ force: options?.skipDb ? false : undefined });

  return {
    configured,
    active: getRateSyncProgress(),
    lastCompleted,
    database,
  };
}
