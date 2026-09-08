import { env } from "../env";
import { getRateConfig } from "./rateConfig";
import { syncCatalogRates } from "./rateSync";
import {
  completeRateSyncRun,
  failRateSyncRun,
  isRateSyncActive,
  tryStartRateSyncRun,
} from "./rateSyncStatus";

let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let schedulerStarted = false;

const MIN_WAKE_MS = 5 * 60_000;

async function refreshIntervalMs(): Promise<number> {
  try {
    const config = await getRateConfig();
    const hours = Math.max(1, config.noonesRateRefreshHours || 1);
    return Math.max(MIN_WAKE_MS, hours * 3_600_000);
  } catch {
    const minutes = Math.max(5, env.rateSync.fallbackMinutes);
    return minutes * 60_000;
  }
}

async function planNextWake(): Promise<void> {
  if (!schedulerStarted) return;
  const wakeMs = await refreshIntervalMs();
  wakeTimer = setTimeout(() => {
    void onSchedulerWake();
  }, wakeMs);
}

async function onSchedulerWake(): Promise<void> {
  if (!schedulerStarted) return;
  if (isRateSyncActive()) {
    await planNextWake();
    return;
  }

  const started = tryStartRateSyncRun({ scope: "full", force: true, trigger: "cron" });
  if (!started) {
    await planNextWake();
    return;
  }

  try {
    console.log("Scheduled rate sync starting…");
    const summary = await syncCatalogRates({ force: true });
    completeRateSyncRun(summary);
    console.log(
      `Scheduled rate sync done: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped` +
        (summary.errors.length ? `, ${summary.errors.length} error(s)` : "")
    );
  } catch (err) {
    failRateSyncRun((err as Error).message);
    console.error("Scheduled rate sync error:", (err as Error).message);
  }

  await planNextWake();
}

export function startRateSyncScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  console.log(
    `Rate sync scheduler on (interval from admin refresh hours; SafeTheTrade first, then ${env.sogo.ratesUrl})`
  );
  wakeTimer = setTimeout(() => {
    void onSchedulerWake();
  }, 8_000);
}

export function stopRateSyncScheduler(): void {
  schedulerStarted = false;
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = null;
}
