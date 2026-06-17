import "dotenv/config";
import { noonesPost } from "../src/services/noones/client";
import { listGiftCardPaymentMethods } from "../src/services/noones/rateSync";
import { NoOnesOfferAllData } from "../src/services/noones/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function countOffers(slug: string): Promise<number> {
  const data = await noonesPost<NoOnesOfferAllData>("offer/all", {
    offer_type: "buy",
    group: "gift-cards",
    payment_method: slug,
    crypto_currency_code: process.env.NOONES_CRYPTO_CURRENCY || "USDT",
    limit: 1,
  });
  return data.totalCount ?? data.count ?? 0;
}

async function main() {
  const methods = await listGiftCardPaymentMethods();
  const results: { slug: string; name: string; offers: number }[] = [];

  for (const m of methods) {
    await sleep(150);
    try {
      const offers = await countOffers(m.slug);
      results.push({ slug: m.slug, name: m.name, offers });
    } catch (err) {
      console.warn(`${m.slug}: ${(err as Error).message}`);
    }
  }

  results.sort((a, b) => a.offers - b.offers);

  const upTo10 = results.filter((r) => r.offers <= 10);
  const over10 = results.filter((r) => r.offers > 10);
  const zero = results.filter((r) => r.offers === 0);

  console.log(`Total: ${results.length}`);
  console.log(`≤10 offers: ${upTo10.length}`);
  console.log(`>10 offers: ${over10.length}`);
  console.log(`0 offers: ${zero.length}`);
  console.log("\nLowest offer counts:");
  for (const r of results.slice(0, 20)) console.log(`  ${r.offers} — ${r.name}`);
  console.log("\nHighest offer counts:");
  for (const r of results.slice(-10)) console.log(`  ${r.offers} — ${r.name}`);
}

main().catch(console.error);
