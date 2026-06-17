import "dotenv/config";
import { canonicalCardSlug } from "@gc4s/shared";
import { prisma } from "../src/prisma";
import { noonesPost } from "../src/services/noones/client";
import { listGiftCardPaymentMethods } from "../src/services/noones/rateSync";
import { paymentMethodToCardName } from "../src/services/noones/rateCatalog";
import { NoOnesOfferAllData } from "../src/services/noones/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_OFFERS = 10;

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

function isOnSite(
  method: { slug: string; name: string },
  cards: { slug: string; name: string; noonesPaymentMethod: string | null }[]
): boolean {
  const name = paymentMethodToCardName(method.slug, method.name);
  const slug = canonicalCardSlug(name);
  return cards.some(
    (c) =>
      c.noonesPaymentMethod === method.slug ||
      c.slug === slug ||
      canonicalCardSlug(c.name) === slug
  );
}

async function main() {
  const cards = await prisma.cardType.findMany({
    select: { slug: true, name: true, noonesPaymentMethod: true },
  });
  const methods = await listGiftCardPaymentMethods();

  const missing: { name: string; slug: string; offers: number }[] = [];
  const onSiteUpTo10: { name: string; slug: string; offers: number }[] = [];

  for (const method of methods) {
    await sleep(150);
    const offers = await countOffers(method.slug);
    if (offers > MAX_OFFERS) continue;

    const entry = { name: method.name, slug: method.slug, offers };
    if (isOnSite(method, cards)) onSiteUpTo10.push(entry);
    else missing.push(entry);
  }

  console.log(`NoOnes gift cards with ≤${MAX_OFFERS} offers:`);
  console.log(`  Already on GiftCard4Sale: ${onSiteUpTo10.length}`);
  console.log(`  Missing from GiftCard4Sale: ${missing.length}`);

  if (missing.length) {
    console.log("\nMissing cards to add:");
    for (const m of missing) console.log(`  ${m.offers} offers — ${m.name} (${m.slug})`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
