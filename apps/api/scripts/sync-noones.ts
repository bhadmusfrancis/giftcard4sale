/**
 * Sync all NoOnes gift-card data into the database:
 * - Card catalog (payment methods → card types, offer counts)
 * - Rate tiers (PHYSICAL + ECODE per country/currency)
 * - Stored quotes and currency denomination metadata
 *
 * Run on a schedule (cron) — not during user page loads.
 *
 * Usage:
 *   npm run sync:noones              # sync stale or missing data only
 *   npm run sync:noones -- --force   # re-fetch all cards from NoOnes
 *   npm run sync:noones -- --card=<cardTypeId>
 */
import "dotenv/config";
import { prisma } from "../src/prisma";
import { isNoOnesConfigured } from "../src/services/noones/client";
import { syncCardRatesFromNoOnes, syncRatesFromNoOnes } from "../src/services/noones/rateSync";
import {
  completeNoOnesSyncRun,
  failNoOnesSyncRun,
  tryStartNoOnesSyncRun,
} from "../src/services/noones/syncStatus";

const args = process.argv.slice(2);
const force = args.includes("--force");
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
  if (!isNoOnesConfigured()) {
    console.error("NoOnes is not configured. Set NOONES_ENABLED=true and NOONES_CLIENT_ID / NOONES_CLIENT_SECRET in apps/api/.env");
    process.exit(1);
  }

  console.log(
    cardTypeId
      ? `Syncing NoOnes data for card ${cardTypeId}…`
      : force
        ? "Syncing all NoOnes gift-card data (force refresh)…"
        : "Syncing stale or missing NoOnes gift-card data…"
  );

  const started = Date.now();
  const scope = cardTypeId ? "card" : "full";
  tryStartNoOnesSyncRun({
    scope,
    force: force || Boolean(cardTypeId),
    trigger: "cli",
    cardTypeId,
    totalCards: scope === "card" ? 1 : undefined,
  });

  let summary;
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        summary = cardTypeId
          ? await syncCardRatesFromNoOnes(cardTypeId, { force: true })
          : await syncRatesFromNoOnes(force ? { force: true } : undefined);
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
  console.log(`\n--- NoOnes sync complete (${elapsed}s) ---`);
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
