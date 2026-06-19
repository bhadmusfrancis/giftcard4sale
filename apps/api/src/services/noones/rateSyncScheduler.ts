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

async function planNextWake(): Promise<void> {
  if (!schedulerStarted) return;

  let wakeMs = 60_000;
  try {
    const config = await getRateConfig();
    const delayMs = await getRateSyncDelayMs(config.noonesRateRefreshMinutes);
    wakeMs = delayMs <= 0 ? 5_000 : Math.min(delayMs, 60_000);
  } catch (err) {
    console.warn("NoOnes rate sync scheduler: could not plan next wake:", (err as Error).message);
  }

  wakeTimer = setTimeout(() => {
    void onSchedulerWake();
  }, Math.max(MIN_WAKE_MS, wakeMs));
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
    const delayMs = await getRateSyncDelayMs(config.noonesRateRefreshMinutes);
    if (delayMs > 0) {
      await planNextWake();
      return;
    }

    const staleCards = await listStaleCardTypeIds(config.noonesRateRefreshMinutes);
    if (!staleCards.length) {
      await planNextWake();
      return;
    }

    const started = tryStartNoOnesSyncRun({
      scope: "full",
      force: false,
      trigger: "cron",
      totalCards: staleCards.length,
    });
    if (!started) {
      await planNextWake();
      return;
    }

    console.log(`NoOnes scheduled sync: ${staleCards.length} stale card(s)`);
    const summary = await syncRatesFromNoOnes({
      force: false,
      cardTypeIds: staleCards.map((c) => c.id),
    });
    completeNoOnesSyncRun(summary);
    console.log(
      `NoOnes scheduled sync done: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`
    );
  } catch (err) {
    failNoOnesSyncRun((err as Error).message);
    console.error("NoOnes scheduled rate sync error:", (err as Error).message);
  }

  const { pauseBetweenBatchesMs } = getNoOnesSyncLimits();
  await sleep(pauseBetweenBatchesMs);
  await planNextWake();
}

/** Start server-side auto-resync when stored rates pass the staleness window. */
export function startNoOnesRateSyncScheduler(): void {
  if (!isNoOnesConfigured()) return;
  if (schedulerStarted) return;
  schedulerStarted = true;
  console.log("NoOnes rate auto-sync scheduler active (respects batch + connection limits)");
  void planNextWake();
}

export function stopNoOnesRateSyncScheduler(): void {
  schedulerStarted = false;
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = null;
}
