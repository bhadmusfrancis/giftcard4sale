import { getRateConfig } from "../rateConfig";
import { env } from "../../env";
import { isNoOnesSyncActive, tryStartNoOnesSyncRun, completeNoOnesSyncRun, failNoOnesSyncRun } from "../noones/syncStatus";
import { syncCatalogRatesFromSogo } from "./rateSync";

let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let schedulerStarted = false;

const MIN_WAKE_MS = 5 * 60_000;

async function refreshIntervalMs(): Promise<number> {
  try {
    const config = await getRateConfig();
    const hours = Math.max(1, config.noonesRateRefreshHours || 1);
    return Math.max(MIN_WAKE_MS, hours * 3_600_000);
  } catch {
    const minutes = Math.max(5, env.sogo.syncMinutes);
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
  if (isNoOnesSyncActive()) {
    await planNextWake();
    return;
  }

  const started = tryStartNoOnesSyncRun({
    scope: "full",
    force: true,
    trigger: "cron",
  });
  if (!started) {
    await planNextWake();
    return;
  }

  try {
    console.log("Sogo scheduled rate sync starting…");
    const summary = await syncCatalogRatesFromSogo({ force: true });
    completeNoOnesSyncRun(summary);
    console.log(
      `Sogo scheduled sync done: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped` +
        (summary.errors.length ? `, ${summary.errors.length} error(s)` : "")
    );
  } catch (err) {
    failNoOnesSyncRun((err as Error).message);
    console.error("Sogo scheduled rate sync error:", (err as Error).message);
  }

  await planNextWake();
}

export function startSogoRateSyncScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  console.log(`Sogo rate sync scheduler on (interval from admin refresh hours, source ${env.sogo.ratesUrl})`);
  wakeTimer = setTimeout(() => {
    void onSchedulerWake();
  }, 8_000);
}

export function stopSogoRateSyncScheduler(): void {
  schedulerStarted = false;
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = null;
}
