/**
 * Sync gift-card rates into the database:
 * - Primary: SafeTheTrade public offer feed (https://safethetrade.com/api/v1)
 * - Then: https://sogo.africa/rates for every card + currency SafeTheTrade skips
 *
 * Usage:
 *   npm run sync:rates
 *   npm run sync:rates -- --card=<cardTypeId>
 */
import "dotenv/config";
import { prisma } from "../src/prisma";
import { syncCatalogRates } from "../src/services/rateSync";
import {
  completeRateSyncRun,
  failRateSyncRun,
  tryStartRateSyncRun,
} from "../src/services/rateSyncStatus";

const args = process.argv.slice(2);
const cardArg = args.find((a) => a.startsWith("--card="));
const cardTypeId = cardArg?.split("=")[1];

function isDbConnectionError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return (
    e.code === "P1001" ||
    e.code === "P1017" ||
    /connection|Can't reach database|closed/i.test(e.message ?? "")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(
    cardTypeId
      ? `Syncing rates for card ${cardTypeId} (SafeTheTrade, then Sogo)…`
      : "Syncing gift-card rates from SafeTheTrade, then Sogo…"
  );

  const started = Date.now();
  const scope = cardTypeId ? "card" : "full";
  tryStartRateSyncRun({
    scope,
    force: true,
    trigger: "cli",
    cardTypeId,
    totalCards: scope === "card" ? 1 : undefined,
  });

  let summary;
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        summary = await syncCatalogRates({ force: true, cardTypeId });
        break;
      } catch (err) {
        if (attempt < 3 && isDbConnectionError(err)) {
          console.warn(`Database connection lost (attempt ${attempt}/3), retrying in 5s…`);
          await prisma.$disconnect();
          await sleep(5000);
          continue;
        }
        throw err;
      }
    }
    if (!summary) throw new Error("Sync did not produce a summary");
    completeRateSyncRun(summary);
  } catch (err) {
    failRateSyncRun((err as Error).message);
    throw err;
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n--- Rate sync complete (${elapsed}s) ---`);
  console.log(`Card types: ${summary.cardTypes}`);
  console.log(`Rates created: ${summary.created}, updated: ${summary.updated}, skipped: ${summary.skipped}`);
  console.log(`Published: ${summary.published}, drafted: ${summary.drafted}`);

  if (summary.errors.length) {
    console.warn(`\nErrors (${summary.errors.length}):`);
    for (const err of summary.errors.slice(0, 20)) console.warn(`  • ${err}`);
    if (summary.errors.length > 20) console.warn(`  … and ${summary.errors.length - 20} more`);
  }

  await prisma.$disconnect();
  process.exit(summary.errors.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
