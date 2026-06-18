import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parseRateText, canonicalCardSlug, sellSlug } from "@gc4s/shared";
import { importRates } from "../src/services/rateImport";
import { env } from "../src/env";

const prisma = new PrismaClient();

const SAMPLE_RATE_TEXT = `Business Hours 7*24
Payment can be made at anytime! 
——————————
===【Apple/iTunes】SLOW ===
● US (200-500 in 100s) = 1092
● US (350/450) = 1084
● US (100/150/250) = 1075
Load: 10-20 mins.
——————————
===【Apple/iTunes】FAST ===
● US (25-90 in 5s) = 1041
● US code (25-95 in 5s) = 935
=========
● UK (10-95 in 5s) = 1169
● UK (150-500 in 50s) = 1240
● CHF (50-200 in 50s) = 1265
● CAD (150-450 in 50s) = 722
● AUD (10-95 in 5s) = 651
● AUD (100-500 in 100s) = 691
● NZD (100-250 in 50s) = 610
● Germany (10-95 in 5s) = 996
● Germany (150-250 in 50s) = 1037
● Finland (50-200 in 50s) = 1029
● Netherlands (100-200 in 50s) = 1037
● France (100-200 in 50s) = 1047
● Spain (100-200 in 50s) = 1051
● Austria (100-200 in 50s) = 1057
● Belgium (50-200 in 50s) = 1037
● Ireland (50-200 in 50s) = 1037
——————————
=====【Razer】=====
● US = 1149
● EUR (10-500 in 10s) = 1047
● Green Razer = 1077
● CAD = 813
● SGP = 834
● AUD = 807
● Brazil = 215
● Malaysia = 285
——————————
=====【X-Box】=====
● US (10-250 in 5s) = 1012
● UK (10-250 in 5s) = 1179
● EUR (10-250 in 5s) = 1077
● AUD (10-250 in 5s) = 642
● CAD (10-250 in 5s) = 653
● SGP (10-250 in 5s) = 661
——————————
=====【Steam】=====
● USA = 903
● EUR = 1047
● GBP = 1214
● CAD = 636
● AUD = 626
● NZD = 514
● CHF = 1134
● PLN = 228
● Other countries are based on USD = 888
——————————
●【Chime mail】(100-1000) = 1179
●【Doordash】(100-500) = 712
●【Gamestop 6364911】(100-500) = 1027
●【Macy】(100-300) = 1157
●【Sephora】(100-500) = 1126
●【Nordstrom】(100-300) = 813
●【Footlocker】(100-500) = 1067
●【PlayStation】(10-200) = 773
●【Roblox】(25-300) = 630
●【Google】(5-500) = 935
●【CVS Pharmacy】(100-500) = 1108
●【Dollar General】(100-500) = 1108`;

async function main() {
  // --- Admin ---
  const adminEmail = env.admin.email.toLowerCase();
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(env.admin.password, 10),
        displayName: "Administrator",
        role: "ADMIN",
        emailVerified: true,
        referralCode: "ADMIN" + Date.now().toString(36).toUpperCase().slice(-4),
      },
    });
    console.log(`Created admin: ${adminEmail} / ${env.admin.password}`);
  }

  // --- Rate config ---
  const cfg = await prisma.rateConfig.findFirst();
  if (!cfg) {
    await prisma.rateConfig.create({
      data: {
        ngnPerUsdt: new Prisma.Decimal(env.rates.ngnPerUsdt),
        ngnPerGhs: new Prisma.Decimal(env.rates.ngnPerGhs),
        nairaReductionPercent: env.reductions.nairaReductionPercent,
        fxReductionPercent: env.reductions.fxReductionPercent,
        referralPercent: env.referralPercent,
        minCountryOffersForDisplay: 5,
      },
    });
    console.log("Created rate config");
  }

  // --- Import sample rates ---
  const { entries, warnings } = parseRateText(SAMPLE_RATE_TEXT);
  const summary = await importRates(entries, true);
  console.log(`Imported ${summary.cardTypes} card types, ${summary.rates} rates.`);
  if (warnings.length) console.log("Warnings:", warnings.slice(0, 5));

  // Retire the old combined CVS/Dollar General card type.
  await prisma.cardType.updateMany({
    where: { slug: "cvs-pharmacy-dollar-general" },
    data: { active: false },
  });
  await prisma.rate.updateMany({
    where: { cardType: { slug: "cvs-pharmacy-dollar-general" } },
    data: { active: false },
  });

  // --- Card types that appear in the FB posts but not the rate text ---
  const extraCards = ["Lowes", "Amazon", "eBay", "Walmart", "Nike", "Visa", "Vanilla"];
  for (const name of extraCards) {
    await prisma.cardType.upsert({
      where: { slug: canonicalCardSlug(name) },
      update: {},
      create: { name, slug: canonicalCardSlug(name), sellSlug: sellSlug(name) },
    });
  }

  // --- Seed example landing pages (rewritten FB posts) ---
  const lowes = await prisma.cardType.findUnique({ where: { slug: "lowes" } });
  await prisma.landingPage.upsert({
    where: { slug: "sell-lowes-gift-card" },
    update: {},
    create: {
      slug: "sell-lowes-gift-card",
      title: "Sell Lowes Gift Card for USDT, Naira or Cedi",
      metaTitle: "Sell Lowes Gift Card Instantly | GiftCard4Sale",
      metaDesc:
        "Get the best rate when you sell your Lowes gift card on GiftCard4Sale. Fast payment in USDT, Naira, or Cedi. Calculate your rate and open a trade in minutes.",
      bodyHtml: `
        <p>Looking to <strong>sell your Lowes gift card</strong> for instant cash? GiftCard4Sale gives you a transparent, competitive rate and pays you in <strong>USDT, Naira, or Cedi</strong>.</p>
        <h3>Why sell your Lowes card with us?</h3>
        <ul>
          <li>Live rate calculator before you commit to a trade.</li>
          <li>Accept both physical cards and e-codes.</li>
          <li>Fast, secure payouts to your wallet, bank account, or crypto address.</li>
          <li>Earn 1% for life on every trade your referrals make.</li>
        </ul>
        <p>Use the calculator on this page to check your exact payout, then open a trade. Make sure your card is valid and unused &mdash; submitting used or invalid cards harms your trust score.</p>
      `,
      sourceUrl: "https://web.facebook.com/share/p/1HNn7qJMHc/",
      cardTypeId: lowes?.id,
      published: true,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
