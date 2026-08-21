import { env } from "../../env";
import { isNoOnesSyncActive, tryStartNoOnesSyncRun, completeNoOnesSyncRun, failNoOnesSyncRun } from "../noones/syncStatus";
import { syncCatalogRatesFromSogo } from "./rateSync";

let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let schedulerStarted = false;

function syncIntervalMs(): number {
  const minutes = Math.max(5, env.sogo.syncMinutes);
  return minutes * 60_000;
}

async function planNextWake(): Promise<void> {
  if (!schedulerStarted) return;
  wakeTimer = setTimeout(() => {
    void onSchedulerWake();
  }, syncIntervalMs());
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
  console.log(`Sogo rate sync scheduler on (every ${env.sogo.syncMinutes}m from ${env.sogo.ratesUrl})`);
  wakeTimer = setTimeout(() => {
    void onSchedulerWake();
  }, 8_000);
}

export function stopSogoRateSyncScheduler(): void {
  schedulerStarted = false;
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = null;
}
