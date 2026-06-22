import { env } from "../../env";
import { generateDailyInsights } from "./generator";

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** Milliseconds until next run at configured UTC hour. */
function msUntilNextRun(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(env.insights.cronHourUtc, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function runDailyJob(): Promise<void> {
  if (!env.insights.enabled) return;
  try {
    const result = await generateDailyInsights();
    if (result.created > 0) {
      console.log(
        `Daily insights: published ${result.created} post(s) for ${result.batchDate} (cycle ${result.cycleNumber}${result.cycleReset ? ", cycle reset" : ""}).`
      );
    }
  } catch (err) {
    console.error("Daily insights job failed:", (err as Error).message);
  }
}

function scheduleNext(): void {
  if (!started) return;
  const delay = msUntilNextRun();
  timer = setTimeout(() => {
    void runDailyJob().finally(scheduleNext);
  }, delay);
}

export function startInsightsScheduler(): void {
  if (!env.insights.enabled || started) return;
  started = true;
  const delay = msUntilNextRun();
  console.log(
    `Insights scheduler: next daily run in ${Math.round(delay / 60_000)} min (UTC ${env.insights.cronHourUtc}:00).`
  );
  timer = setTimeout(() => {
    void runDailyJob().finally(scheduleNext);
  }, delay);
}

export function stopInsightsScheduler(): void {
  started = false;
  if (timer) clearTimeout(timer);
  timer = null;
}
