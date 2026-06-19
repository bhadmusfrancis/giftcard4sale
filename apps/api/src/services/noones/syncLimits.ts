import { env } from "../../env";

/** Tunable limits to stay within Neon / Prisma pool and NoOnes API throughput. */
export function getNoOnesSyncLimits() {
  return {
    /** Cards processed before a longer pause. */
    cardsPerBatch: env.noones.syncBatchSize,
    /** Pause between card batches (ms). */
    pauseBetweenBatchesMs: env.noones.syncBatchPauseMs,
    /** Pause after each card within a batch (ms). */
    pauseBetweenCardsMs: env.noones.syncCardPauseMs,
    /** Pause between rate-tier NoOnes fetches (ms). */
    pauseBetweenTargetsMs: env.noones.syncTargetPauseMs,
    /** Pause between per-card stale checks (ms). */
    staleCheckPauseMs: env.noones.staleCheckPauseMs,
    /** Cards checked per stale-scan batch before a short pause. */
    staleCheckBatchSize: env.noones.staleCheckBatchSize,
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
