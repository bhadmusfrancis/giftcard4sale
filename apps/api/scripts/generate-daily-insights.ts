/**
 * Generate daily gift-card insight articles (7 active cards, full rotation).
 *
 * Usage: npx tsx scripts/generate-daily-insights.ts
 * Options:
 *   --dry-run   Research and write without saving to DB
 *   --force     Regenerate even if today's batch exists
 *   --date=YYYY-MM-DD  Target batch date (UTC)
 */
import { generateDailyInsights } from "../src/services/insights/generator";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const dateArg = process.argv.find((a) => a.startsWith("--date="));
const batchDate = dateArg ? new Date(dateArg.split("=")[1] + "T12:00:00Z") : undefined;

async function main() {
  console.log(`Generating daily insights${dryRun ? " (dry run)" : ""}…`);
  const result = await generateDailyInsights({ dryRun, force, batchDate });
  console.log("\n--- Insights summary ---");
  console.log(`Batch date:   ${result.batchDate}`);
  console.log(`Created:      ${result.created}`);
  console.log(`Skipped:      ${result.skipped}`);
  console.log(`Cycle:        ${result.cycleNumber}${result.cycleReset ? " (reset)" : ""}`);
  for (const c of result.cards) {
    console.log(`  • ${c.name} → /insights/${c.insightSlug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
