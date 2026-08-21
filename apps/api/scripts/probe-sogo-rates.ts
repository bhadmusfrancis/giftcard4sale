/**
 * Dry-run: parse https://sogo.africa/rates and print a summary.
 *   npx tsx scripts/probe-sogo-rates.ts
 */
import { fetchSogoGiftCardRates } from "../src/services/sogo/scraper";
import { loadContactedPartnerUsernames, loadPartnerLastTradedRates } from "../src/services/sogo/partnerFallback";

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

  const contacted = loadContactedPartnerUsernames();
  console.log(`\nContacted partners: ${contacted.size}`);
  const fallback = await loadPartnerLastTradedRates();
  console.log(`Partner last-traded rows: ${fallback.length}`);
  for (const row of fallback.slice(0, 25)) {
    console.log(`  ${row.cardName} ${row.currency} ₦${row.nairaPerUnit.toFixed(2)} (${row.partner})`);
  }
  if (fallback.length > 25) console.log(`  … ${fallback.length - 25} more`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
