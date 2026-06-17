/**
 * Merge duplicate gift card types (e.g. "Amazon" + "Amazon Gift Card").
 *
 * Usage: npx tsx scripts/dedupe-card-types.ts
 */
import "dotenv/config";
import { prisma } from "../src/prisma";
import { dedupeCardTypes } from "../src/services/cardTypeDedup";

async function main() {
  const summary = await dedupeCardTypes();

  if (!summary.merged.length) {
    console.log("No duplicate card types found.");
  } else {
    console.log(`Merged ${summary.merged.length} duplicate card type(s):\n`);
    for (const m of summary.merged) {
      console.log(`  Kept ${m.keeper}`);
      console.log(`  Removed ${m.removed}`);
      console.log(`  Rates moved: ${m.ratesMoved}, dropped (conflict): ${m.ratesDropped}\n`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
