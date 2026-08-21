/**
 * Sync gift-card rates into the database:
 * - Primary: https://sogo.africa/rates (HTML scrape until SOGO_RATES_API_URL is set)
 * - Fallback: last successful trades with contacted NoOnes partners
 *
 * Usage:
 *   npm run sync:noones              # Sogo + partner fallback
 *   npm run sync:noones -- --card=<cardTypeId>
 *   npm run sync:noones -- --from-noones   # legacy NoOnes marketplace sync
 */
import "dotenv/config";
import { prisma } from "../src/prisma";
import { isNoOnesConfigured } from "../src/services/noones/client";
import { syncCardRatesFromNoOnes, syncRatesFromNoOnes } from "../src/services/noones/rateSync";
import { syncCatalogRatesFromSogo } from "../src/services/sogo";
import {
  completeNoOnesSyncRun,
  failNoOnesSyncRun,
  tryStartNoOnesSyncRun,
} from "../src/services/noones/syncStatus";

const args = process.argv.slice(2);
const force = args.includes("--force");
const fromNoones = args.includes("--from-noones");
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
  if (fromNoones && !isNoOnesConfigured()) {
    console.error("NoOnes is not configured. Set NOONES_ENABLED=true and credentials, or omit --from-noones to sync from Sogo.");
    process.exit(1);
  }

  console.log(
    fromNoones
      ? cardTypeId
        ? `Syncing NoOnes data for card ${cardTypeId}…`
        : "Syncing gift-card data from NoOnes…"
      : cardTypeId
        ? `Syncing Sogo/partner rates for card ${cardTypeId}…`
        : "Syncing gift-card rates from Sogo (partner last-traded fallback)…"
  );

  const started = Date.now();
  const scope = cardTypeId ? "card" : "full";
  tryStartNoOnesSyncRun({
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
        if (fromNoones) {
          summary = cardTypeId
            ? await syncCardRatesFromNoOnes(cardTypeId, { force: true })
            : await syncRatesFromNoOnes(force ? { force: true } : undefined);
        } else {
          summary = await syncCatalogRatesFromSogo({ force: true, cardTypeId });
        }
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
    completeNoOnesSyncRun(summary);
  } catch (err) {
    failNoOnesSyncRun((err as Error).message);
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
