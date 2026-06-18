import { env } from "../../env";

import { getRateConfig, getRateSyncDelayMs } from "../rateConfig";

import { isNoOnesConfigured } from "./client";
import { repairManualRateCatalog } from "../cardVisibility";
import { syncRatesFromNoOnes } from "./rateSync";
import { prisma } from "../../prisma";

import { pollActiveNoOnesTrades } from "./tradeExecutor";

import { registerNoOnesWebhooks } from "./webhooks";



let rateTimer: ReturnType<typeof setTimeout> | null = null;
let rateSyncRunning = false;

let pollTimer: ReturnType<typeof setInterval> | null = null;



/** Start background NoOnes jobs when enabled. */

export function startNoOnesJobs(): void {

  if (!isNoOnesConfigured()) {

    console.log("NoOnes integration disabled (set NOONES_ENABLED=true + credentials)");

    return;

  }



  const pollMs = env.noones.tradePollMinutes * 60_000;



  const runRateSync = async () => {
    if (rateSyncRunning) return;
    rateSyncRunning = true;
    try {
      await repairManualRateCatalog();
      await prisma.rate.updateMany({
        where: { speed: "NOONES", active: true, minDenom: null, maxDenom: null },
        data: { active: false },
      });
      const s = await syncRatesFromNoOnes();
      if (s.created || s.updated || s.errors.length) {
        console.log(
          `NoOnes rate sync: ${s.created} created, ${s.updated} updated, ${s.skipped} skipped, ${s.published} published, ${s.drafted} drafted, ${s.cardTypes} cards, ${s.errors.length} errors`
        );
      }
    } catch (e) {
      console.error("NoOnes rate sync error:", (e as Error).message);
    } finally {
      rateSyncRunning = false;
    }
  };

  const scheduleRateSync = async () => {
    let refreshMinutes = env.noones.rateSyncMinutes;
    try {
      ({ noonesRateRefreshMinutes: refreshMinutes } = await getRateConfig());
    } catch {
      // Fall back to env when config is unavailable.
    }

    const delayMs = await getRateSyncDelayMs(refreshMinutes);
    // When still overdue after a sync attempt, retry soon — but not in a tight loop.
    const waitMs = delayMs === 0 ? 30_000 : delayMs;
    rateTimer = setTimeout(async () => {
      await runRateSync();
      await scheduleRateSync();
    }, waitMs);
  };

  const kickOffRateSync = async () => {
    let refreshMinutes = env.noones.rateSyncMinutes;
    try {
      ({ noonesRateRefreshMinutes: refreshMinutes } = await getRateConfig());
    } catch {
      // Fall back to env when config is unavailable.
    }

    const delayMs = await getRateSyncDelayMs(refreshMinutes);
    if (delayMs === 0) {
      await runRateSync();
    }
    await scheduleRateSync();
  };

  kickOffRateSync();



  pollTimer = setInterval(() => {

    pollActiveNoOnesTrades().catch((e) => console.error("NoOnes trade poll error:", e.message));

  }, pollMs);



  if (env.noones.webhookUrl && env.noones.applicationId) {

    registerNoOnesWebhooks().catch((e) => console.warn("NoOnes webhook setup:", e.message));

  }



  console.log(

    `NoOnes integration active (rate refresh from admin config, trade poll every ${env.noones.tradePollMinutes}m)`

  );

}



export function stopNoOnesJobs(): void {

  if (rateTimer) clearTimeout(rateTimer);

  if (pollTimer) clearInterval(pollTimer);

}



export * from "./client";

export * from "./offers";

export * from "./receiptPolicy";

export * from "./rates";

export * from "./storedQuotes";

export * from "./rateSync";

export * from "./tradeExecutor";

export * from "./webhooks";

export * from "./paymentMethods";

export * from "./currencyMeta";
export * from "./regionLock";

