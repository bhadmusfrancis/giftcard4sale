import { env } from "../../env";

import { getRateConfig } from "../rateConfig";

import { isNoOnesConfigured } from "./client";

import { syncRatesFromNoOnes } from "./rateSync";

import { pollActiveNoOnesTrades } from "./tradeExecutor";

import { registerNoOnesWebhooks } from "./webhooks";



let rateTimer: ReturnType<typeof setTimeout> | null = null;

let pollTimer: ReturnType<typeof setInterval> | null = null;



/** Start background NoOnes jobs when enabled. */

export function startNoOnesJobs(): void {

  if (!isNoOnesConfigured()) {

    console.log("NoOnes integration disabled (set NOONES_ENABLED=true + credentials)");

    return;

  }



  const pollMs = env.noones.tradePollMinutes * 60_000;



  const runRateSync = async () => {

    try {

      const s = await syncRatesFromNoOnes();

      if (s.created || s.updated || s.errors.length) {

        console.log(

          `NoOnes rate sync: ${s.created} created, ${s.updated} updated, ${s.skipped} skipped, ${s.published} published, ${s.drafted} drafted, ${s.cardTypes} cards, ${s.errors.length} errors`

        );

      }

    } catch (e) {

      console.error("NoOnes rate sync error:", (e as Error).message);

    }

  };



  const scheduleRateSync = async () => {

    let refreshMinutes = env.noones.rateSyncMinutes;

    try {

      ({ noonesRateRefreshMinutes: refreshMinutes } = await getRateConfig());

    } catch {

      // Fall back to env when config is unavailable.

    }



    rateTimer = setTimeout(async () => {

      await runRateSync();

      await scheduleRateSync();

    }, refreshMinutes * 60_000);

  };



  runRateSync().then(scheduleRateSync);



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

