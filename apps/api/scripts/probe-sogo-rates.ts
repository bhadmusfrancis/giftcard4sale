/**
 * Dry-run both catalog rate sources and print what they would persist.
 * Reads only — nothing is written to the database.
 *   npx tsx scripts/probe-sogo-rates.ts
 */
import { fetchSogoGiftCardRates } from "../src/services/sogo/scraper";
import { fetchSafeTheTradeRates } from "../src/services/safethetrade";
import { getRateConfig } from "../src/services/rateConfig";
import { prisma } from "../src/prisma";

async function main() {
  const cards = await fetchSogoGiftCardRates();
  console.log(`Sogo cards: ${cards.length}`);
  for (const card of cards) {
    const bits = card.currencies.map((c) => {
      const phys = c.physical ? `P ₦${c.physical.nairaPerUnit}` : "";
      const eco = c.ecode ? `E ₦${c.ecode.nairaPerUnit}` : "";
      return `${c.currency} ${[phys, eco].filter(Boolean).join("/")}`;
    });
    console.log(`  ${card.name}: ${bits.join("; ")}`);
  }

  const config = await getRateConfig();
  console.log(`\nNGN per USDT: ${config.rates.ngnPerUsdt}`);

  const stt = await fetchSafeTheTradeRates(config.rates.ngnPerUsdt);
  console.log(`SafeTheTrade rows: ${stt.length}`);
  for (const row of stt) {
    const pct = ((row.nairaPerUnit / config.rates.ngnPerUsdt) * 100).toFixed(1);
    console.log(
      `  ${row.cardName} (${row.slugHint}) ${row.currency} ₦${row.nairaPerUnit.toFixed(2)}/unit ` +
        `≈${pct}% of a USD face unit, ${row.minDenom}-${row.maxDenom}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
