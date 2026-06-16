import { env } from "../../env";
import { isNoOnesConfigured } from "./client";
import { syncRatesFromNoOnes } from "./rateSync";
import { pollActiveNoOnesTrades } from "./tradeExecutor";
import { registerNoOnesWebhooks } from "./webhooks";

let rateTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/** Start background NoOnes jobs when enabled. */
export function startNoOnesJobs(): void {
  if (!isNoOnesConfigured()) {
    console.log("NoOnes integration disabled (set NOONES_ENABLED=true + credentials)");
    return;
  }

  const rateMs = env.noones.rateSyncMinutes * 60_000;
  const pollMs = env.noones.tradePollMinutes * 60_000;

  const runRateSync = () => {
    syncRatesFromNoOnes()
      .then((s) => {
        if (s.created || s.updated || s.errors.length) {
          console.log(
            `NoOnes rate sync: ${s.created} created, ${s.updated} updated, ${s.skipped} skipped, ${s.cardTypes} cards, ${s.errors.length} errors`
          );
        }
      })
      .catch((e) => console.error("NoOnes rate sync error:", e.message));
  };

  runRateSync();
  rateTimer = setInterval(runRateSync, rateMs);

  pollTimer = setInterval(() => {
    pollActiveNoOnesTrades().catch((e) => console.error("NoOnes trade poll error:", e.message));
  }, pollMs);

  if (env.noones.webhookUrl && env.noones.applicationId) {
    registerNoOnesWebhooks().catch((e) => console.warn("NoOnes webhook setup:", e.message));
  }

  console.log(
    `NoOnes integration active (rates every ${env.noones.rateSyncMinutes}m, trade poll every ${env.noones.tradePollMinutes}m)`
  );
}

export function stopNoOnesJobs(): void {
  if (rateTimer) clearInterval(rateTimer);
  if (pollTimer) clearInterval(pollTimer);
}

export * from "./client";
export * from "./rates";
export * from "./rateSync";
export * from "./tradeExecutor";
export * from "./webhooks";
export * from "./paymentMethods";
