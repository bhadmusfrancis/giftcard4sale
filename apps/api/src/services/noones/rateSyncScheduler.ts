import { getRateConfig, getRateSyncDelayMs, listStaleCardTypeIds } from "../rateConfig";
import { isNoOnesConfigured } from "./client";
import { syncRatesFromNoOnes } from "./rateSync";
import { getNoOnesSyncLimits, sleep } from "./syncLimits";
import {
  completeNoOnesSyncRun,
  failNoOnesSyncRun,
  isNoOnesSyncActive,
  tryStartNoOnesSyncRun,
} from "./syncStatus";

let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let schedulerStarted = false;

/** Minimum interval between scheduler wake-ups (ms). */
const MIN_WAKE_MS = 30_000;
/** Wake quickly when individual cards are still stale (ignores global latest-rate timestamp). */
const STALE_WAKE_MS = 5_000;

type WakeHint = { remainingStale?: number };

async function planNextWake(hint?: WakeHint): Promise<void> {
  if (!schedulerStarted) return;

  let wakeMs = 60_000;
  let remainingStale = 0;
  try {
    const config = await getRateConfig();
    remainingStale =
      hint?.remainingStale ??
      (await listStaleCardTypeIds(config.noonesRateRefreshHours)).length;

    if (remainingStale > 0) {
      // Per-card staleness drives the schedule — do not wait for a global refresh window
      // just because popular cards were synced recently.
      wakeMs = STALE_WAKE_MS;
    } else {
      const delayMs = await getRateSyncDelayMs(config.noonesRateRefreshHours);
      wakeMs = delayMs <= 0 ? STALE_WAKE_MS : Math.min(delayMs, 60_000);
    }
  } catch (err) {
    console.warn("NoOnes rate sync scheduler: could not plan next wake:", (err as Error).message);
  }

  wakeTimer = setTimeout(() => {
    void onSchedulerWake();
  }, remainingStale > 0 ? STALE_WAKE_MS : Math.max(MIN_WAKE_MS, wakeMs));
}

async function onSchedulerWake(): Promise<void> {
  if (!schedulerStarted || !isNoOnesConfigured()) {
    await planNextWake();
    return;
  }

  if (isNoOnesSyncActive()) {
    await planNextWake();
    return;
  }

  try {
    const config = await getRateConfig();
    const staleCards = await listStaleCardTypeIds(config.noonesRateRefreshHours);
    if (!staleCards.length) {
      await planNextWake({ remainingStale: 0 });
      return;
    }

    const { scheduledStaleCardsPerRun } = getNoOnesSyncLimits();
    const batch = staleCards.slice(0, scheduledStaleCardsPerRun);
    const remainingStale = staleCards.length - batch.length;

    const started = tryStartNoOnesSyncRun({
      scope: "full",
      force: false,
      trigger: "cron",
      totalCards: batch.length,
    });
    if (!started) {
      await planNextWake({ remainingStale: staleCards.length });
      return;
    }

    console.log(
      `NoOnes scheduled sync: ${batch.length} stale card(s)` +
        (remainingStale > 0 ? ` (${remainingStale} more queued)` : "") +
        ` — first: ${batch[0]?.name ?? "?"}`
    );
    const summary = await syncRatesFromNoOnes({
      force: false,
      cardTypeIds: batch.map((c) => c.id),
    });
    completeNoOnesSyncRun(summary);
    console.log(
      `NoOnes scheduled sync done: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`
    );

    await planNextWake({ remainingStale: remainingStale > 0 ? remainingStale : undefined });
  } catch (err) {
    failNoOnesSyncRun((err as Error).message);
    console.error("NoOnes scheduled rate sync error:", (err as Error).message);
    await planNextWake();
  }

  const { pauseBetweenBatchesMs } = getNoOnesSyncLimits();
  await sleep(pauseBetweenBatchesMs);
}

/** Start server-side auto-resync when stored rates pass the staleness window. */
export function startNoOnesRateSyncScheduler(): void {
  if (!isNoOnesConfigured()) return;
  if (schedulerStarted) return;
  schedulerStarted = true;
  console.log("NoOnes rate auto-sync scheduler active (respects batch + connection limits)");
  void onSchedulerWake();
}

export function stopNoOnesRateSyncScheduler(): void {
  schedulerStarted = false;
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = null;
}
