/**
 * One-off cleanup: delete all NoOnes-synced rate rows (across every gift card)
 * whose last sync (`updatedAt`) was more than 5 hours ago.
 *
 * Manual rates (speed != "NOONES") are never touched.
 *
 * Usage:
 *   npm run purge:stale-rates            # delete synced rows older than 5h
 *   npm run purge:stale-rates -- --dry   # report what would be deleted only
 *   npm run purge:stale-rates -- --hours=8
 */
import "dotenv/config";
import { prisma } from "../src/prisma";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const hoursArg = args.find((a) => a.startsWith("--hours="));
const hours = Number(hoursArg?.split("=")[1] ?? 5);

async function main() {
  if (!Number.isFinite(hours) || hours <= 0) {
    console.error(`Invalid --hours value: ${hoursArg}`);
    process.exit(1);
  }

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const where = {
    speed: "NOONES",
    updatedAt: { lt: cutoff },
  } as const;

  const matching = await prisma.rate.count({ where });
  console.log(
    `Synced (NOONES) rate rows last updated before ${cutoff.toISOString()} (> ${hours}h ago): ${matching}`
  );

  if (matching === 0) {
    console.log("Nothing to delete.");
    await prisma.$disconnect();
    process.exit(0);
  }

  if (dryRun) {
    console.log("Dry run — no rows deleted.");
    await prisma.$disconnect();
    process.exit(0);
  }

  const result = await prisma.rate.deleteMany({ where });
  console.log(`Deleted ${result.count} stale synced rate row(s).`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
