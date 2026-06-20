import { prisma } from "../../prisma";
import { getRateConfig, isCardRateDataStale } from "../rateConfig";
import { noonesLinkedCardWhere } from "./exclusions";
import type { RateSyncSummary } from "./rateSync";

export type NoOnesSyncPhase = "idle" | "discovering" | "syncing" | "completed" | "failed";
export type NoOnesSyncScope = "full" | "card";
export type NoOnesSyncTrigger = "admin" | "cli" | "cron";

export interface NoOnesSyncProgress {
  running: boolean;
  phase: NoOnesSyncPhase;
  scope: NoOnesSyncScope | null;
  trigger: NoOnesSyncTrigger | null;
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

export interface NoOnesSyncDbStats {
  noonesCards: number;
  noonesRates: number;
  activeNoonesRates: number;
  latestRateUpdate: string | null;
  staleCards: number;
  refreshHours: number;
}

export interface NoOnesSyncStatusResponse {
  configured: boolean;
  active: NoOnesSyncProgress;
  lastCompleted: NoOnesSyncProgress | null;
  database: NoOnesSyncDbStats;
}

const emptySummary = (): RateSyncSummary => ({
  created: 0,
  updated: 0,
  skipped: 0,
  drafted: 0,
  published: 0,
  cardTypes: 0,
  errors: [],
});

function idleProgress(): NoOnesSyncProgress {
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
    summary: emptySummary(),
    recentErrors: [],
    lastError: null,
  };
}

let active: NoOnesSyncProgress = idleProgress();
let lastCompleted: NoOnesSyncProgress | null = null;

const MAX_RECENT_ERRORS = 30;
const DB_STATS_TTL_MS = 60_000;

let cachedDbStats: NoOnesSyncDbStats | null = null;
let cachedDbStatsAt = 0;
let dbStatsInFlight: Promise<NoOnesSyncDbStats> | null = null;

function snapshot(p: NoOnesSyncProgress): NoOnesSyncProgress {
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

export function isNoOnesSyncActive(): boolean {
  return active.running;
}

export function tryStartNoOnesSyncRun(params: {
  scope: NoOnesSyncScope;
  force?: boolean;
  trigger: NoOnesSyncTrigger;
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
    summary: emptySummary(),
    recentErrors: [],
    lastError: null,
  };
  if (!cachedDbStats) {
    void getNoOnesSyncDbStats().catch(() => {});
  }
  return true;
}

export function setNoOnesSyncPhase(phase: NoOnesSyncPhase): void {
  if (!active.running) return;
  active.phase = phase;
}

export function setNoOnesSyncTotalCards(total: number): void {
  if (!active.running) return;
  active.totalCards = total;
}

export function setNoOnesSyncCurrentCard(card: { id: string; name: string }, processed: number): void {
  if (!active.running) return;
  active.phase = "syncing";
  active.currentCard = card;
  active.processedCards = processed;
}

export function mergeNoOnesSyncSummary(partial: Partial<RateSyncSummary>): void {
  if (!active.running) return;
  const s = active.summary;
  if (partial.created != null) s.created = partial.created;
  if (partial.updated != null) s.updated = partial.updated;
  if (partial.skipped != null) s.skipped = partial.skipped;
  if (partial.drafted != null) s.drafted = partial.drafted;
  if (partial.published != null) s.published = partial.published;
  if (partial.cardTypes != null) s.cardTypes = partial.cardTypes;
}

export function addNoOnesSyncErrors(errors: string[]): void {
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

export function completeNoOnesSyncRun(summary: RateSyncSummary): void {
  if (!active.running) return;
  active.running = false;
  active.phase = summary.errors.length ? "completed" : "completed";
  active.finishedAt = new Date().toISOString();
  active.summary = { ...summary, errors: [...summary.errors] };
  active.processedCards = active.totalCards || active.processedCards;
  active.currentCard = null;
  lastCompleted = snapshot(active);
  active = idleProgress();
  cachedDbStatsAt = 0;
}

export function failNoOnesSyncRun(message: string): void {
  if (!active.running) {
    lastCompleted = {
      ...idleProgress(),
      phase: "failed",
      finishedAt: new Date().toISOString(),
      lastError: message,
      recentErrors: [message],
      summary: { ...emptySummary(), errors: [message] },
    };
    cachedDbStatsAt = 0;
    return;
  }
  active.running = false;
  active.phase = "failed";
  active.finishedAt = new Date().toISOString();
  active.lastError = message;
  addNoOnesSyncErrors([message]);
  lastCompleted = snapshot(active);
  active = idleProgress();
  cachedDbStatsAt = 0;
}

export function getNoOnesSyncProgress(): NoOnesSyncProgress {
  return snapshot(active);
}

export async function getNoOnesSyncDbStats(options?: { force?: boolean }): Promise<NoOnesSyncDbStats> {
  const now = Date.now();

  if (isNoOnesSyncActive() && cachedDbStats && !options?.force) {
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

      const noonesCards = await prisma.cardType.count({
        where: noonesLinkedCardWhere(),
      });
      const noonesRates = await prisma.rate.count({ where: { speed: "NOONES" } });
      const activeNoones = await prisma.rate.count({
        where: { speed: "NOONES", active: true },
      });
      const latestRate = await prisma.rate.findFirst({
        where: { speed: "NOONES" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      });

      let staleCards = 0;
      if (!isNoOnesSyncActive()) {
        const linkedCards = await prisma.cardType.findMany({
          where: noonesLinkedCardWhere(),
          select: { id: true },
        });
        for (const c of linkedCards) {
          if (await isCardRateDataStale(c.id, refreshHours)) staleCards++;
        }
      }

      const stats: NoOnesSyncDbStats = {
        noonesCards,
        noonesRates,
        activeNoonesRates: activeNoones,
        latestRateUpdate: latestRate?.updatedAt.toISOString() ?? null,
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

export async function getNoOnesSyncStatusResponse(
  configured: boolean,
  options?: { skipDb?: boolean }
): Promise<NoOnesSyncStatusResponse> {
  const database =
    options?.skipDb && cachedDbStats
      ? cachedDbStats
      : options?.skipDb && isNoOnesSyncActive()
        ? cachedDbStats ?? {
            noonesCards: 0,
            noonesRates: 0,
            activeNoonesRates: 0,
            latestRateUpdate: null,
            staleCards: 0,
            refreshHours: 1,
          }
        : await getNoOnesSyncDbStats({ force: options?.skipDb ? false : undefined });

  return {
    configured,
    active: getNoOnesSyncProgress(),
    lastCompleted,
    database,
  };
}
