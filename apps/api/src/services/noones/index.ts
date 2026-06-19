import { env } from "../../env";

import { isNoOnesConfigured } from "./client";

import { pollActiveNoOnesTrades } from "./tradeExecutor";

import { registerNoOnesWebhooks } from "./webhooks";

let pollTimer: ReturnType<typeof setInterval> | null = null;

/** Start background NoOnes jobs when enabled (trade polling only — rates sync on demand). */
export function startNoOnesJobs(): void {
  if (!isNoOnesConfigured()) {
    console.log("NoOnes integration disabled (set NOONES_ENABLED=true + credentials)");
    return;
  }

  const pollMs = env.noones.tradePollMinutes * 60_000;

  pollTimer = setInterval(() => {
    pollActiveNoOnesTrades().catch((e) => console.error("NoOnes trade poll error:", e.message));
  }, pollMs);

  if (env.noones.webhookUrl && env.noones.applicationId) {
    registerNoOnesWebhooks().catch((e) => console.warn("NoOnes webhook setup:", e.message));
  }

  console.log(
    `NoOnes integration active (on-demand rate sync, trade poll every ${env.noones.tradePollMinutes}m)`
  );
}

export function stopNoOnesJobs(): void {
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

