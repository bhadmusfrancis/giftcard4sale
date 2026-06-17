/**
 * Import NoOnes gift-card payment methods with ≤ maxOffers active offers
 * that are not yet on GiftCard4Sale.
 *
 * Usage: npx tsx scripts/import-noones-cards.ts [--max-offers=10] [--dry-run]
 */
import "dotenv/config";
import { canonicalCardSlug, sellSlug } from "@gc4s/shared";
import { prisma } from "../src/prisma";
import { isNoOnesConfigured } from "../src/services/noones/client";
import { paymentMethodToCardName } from "../src/services/noones/rateCatalog";
import { findExistingCardType } from "../src/services/cardTypeDedup";
import { listGiftCardPaymentMethods } from "../src/services/noones/rateSync";
import { countNoOnesOffers } from "../src/services/noones/offers";
import { isCardPublishable, MAX_OFFERS_FOR_PUBLISH } from "../src/services/noones/publishPolicy";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const maxOffersArg = args.find((a) => a.startsWith("--max-offers="));
const maxOffers = maxOffersArg ? Number(maxOffersArg.split("=")[1]) : MAX_OFFERS_FOR_PUBLISH;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function countOffers(paymentMethod: string): Promise<number> {
  return countNoOnesOffers(paymentMethod);
}

async function alreadyExists(
  method: { slug: string; name: string },
  existing: { slug: string; noonesPaymentMethod: string | null; name: string }[]
): Promise<boolean> {
  const found = await findExistingCardType(method);
  if (found) return true;

  const name = paymentMethodToCardName(method.slug, method.name);
  const slug = canonicalCardSlug(name);
  return existing.some(
    (c) =>
      c.noonesPaymentMethod === method.slug ||
      c.slug === slug ||
      canonicalCardSlug(c.name) === slug
  );
}

async function main() {
  if (!isNoOnesConfigured()) {
    console.error("NoOnes is not configured. Set NOONES_* env vars.");
    process.exit(1);
  }

  console.log(`Fetching NoOnes gift cards with up to ${maxOffers} offers${dryRun ? " (dry run)" : ""}…\n`);

  const methods = await listGiftCardPaymentMethods();
  console.log(`Found ${methods.length} gift-card payment methods on NoOnes.\n`);

  const existing = await prisma.cardType.findMany({
    select: { id: true, slug: true, name: true, noonesPaymentMethod: true },
  });
  console.log(`GiftCard4Sale already has ${existing.length} card types.\n`);

  const toAdd: { method: { name: string; slug: string }; offerCount: number }[] = [];
  const skippedExisting: string[] = [];
  const skippedTooMany: string[] = [];

  for (const method of methods) {
    if (await alreadyExists(method, existing)) {
      skippedExisting.push(method.slug);
      continue;
    }

    await sleep(200);
    let offerCount: number;
    try {
      offerCount = await countOffers(method.slug);
    } catch (err) {
      console.warn(`  ⚠ ${method.slug}: failed to count offers — ${(err as Error).message}`);
      continue;
    }

    if (!isCardPublishable(offerCount, maxOffers)) {
      skippedTooMany.push(`${method.slug} (${offerCount} offers)`);
      continue;
    }

    toAdd.push({ method, offerCount });
    console.log(`  + ${method.name || method.slug} — ${offerCount} offer(s)`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Already on site: ${skippedExisting.length}`);
  console.log(`Too many offers (>${maxOffers}): ${skippedTooMany.length}`);
  console.log(`To add: ${toAdd.length}`);

  if (!toAdd.length) {
    console.log("\nNothing to import.");
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log("\nDry run — no changes written.");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  for (const { method, offerCount } of toAdd) {
    const name = paymentMethodToCardName(method.slug, method.name);
    const slug = canonicalCardSlug(name);
    const existingCard = await findExistingCardType(method);

    if (existingCard) {
      await prisma.cardType.update({
        where: { id: existingCard.id },
        data: { name, noonesPaymentMethod: method.slug, offerCount, active: true },
      });
      console.log(`  ✓ Linked ${name} to existing card (${method.slug}, ${offerCount} offers)`);
      continue;
    }

    await prisma.cardType.create({
      data: {
        name,
        slug,
        sellSlug: sellSlug(name),
        noonesPaymentMethod: method.slug,
        offerCount,
        active: true,
      },
    });
    created++;
    console.log(`  ✓ Created ${name} (${method.slug}, ${offerCount} offers)`);
  }

  console.log(`\nCreated ${created} new card type(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
