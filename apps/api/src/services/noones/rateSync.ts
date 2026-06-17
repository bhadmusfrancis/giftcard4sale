import { CardMedium, Prisma } from "@prisma/client";
import { canonicalCardSlug, sellSlug } from "@gc4s/shared";
import { prisma } from "../../prisma";
import { findExistingCardType } from "../cardTypeDedup";
import { getRateConfig, isRateSyncFresh } from "../rateConfig";
import { isNoOnesConfigured, noonesPost } from "./client";
import { resolvePaymentMethodSlug } from "./paymentMethods";
import { buildSyncTargets, paymentMethodToCardName, RateSyncTarget, OTHER_COUNTRY_TIER, appendDiscoveredCurrencyTargets } from "./rateCatalog";
import { countNoOnesOffers, discoverOfferCurrencies } from "./offers";
import { fetchStoredQuotesForTarget, storedQuotesToJson } from "./storedQuotes";
import { hasOtherCountryOffers } from "./otherCountries";
import { fetchAverageOfferForMedium } from "./rates";
import { StoredQuotes } from "@gc4s/shared";
import { isCardPublishable } from "./publishPolicy";

export interface RateSyncSummary {
  created: number;
  updated: number;
  skipped: number;
  drafted: number;
  published: number;
  cardTypes: number;
  errors: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface NoOnesPaymentMethod {
  name: string;
  slug: string;
  group_slug?: string;
}

function parsePaymentMethodList(raw: unknown): NoOnesPaymentMethod[] {
  if (Array.isArray(raw)) return raw;
  const obj = raw as { methods?: NoOnesPaymentMethod[]; data?: NoOnesPaymentMethod[] };
  return obj.methods ?? obj.data ?? [];
}

/** List gift-card payment methods from NoOnes. */
export async function listGiftCardPaymentMethods(): Promise<{ name: string; slug: string }[]> {
  const raw = await noonesPost<unknown>("payment-method/list", {});
  const list = parsePaymentMethodList(raw);
  return list.filter(
    (m) =>
      m.group_slug === "gift-cards" ||
      /gift.?card|itunes|steam|playstation|xbox|google-play/i.test(m.slug)
  );
}

/** Ensure a CardType exists for each NoOnes gift-card payment method. */
async function ensureCardTypesFromNoOnes(): Promise<number> {
  const methods = await listGiftCardPaymentMethods();
  let count = 0;

  for (const method of methods) {
    const name = paymentMethodToCardName(method.slug, method.name);
    const slug = canonicalCardSlug(name);
    const existing = await findExistingCardType(method);

    let offerCount = 0;
    try {
      offerCount = await countNoOnesOffers(method.slug);
    } catch (err) {
      console.warn(`NoOnes offer count for ${method.slug}: ${(err as Error).message}`);
    }
    const publishable = isCardPublishable(offerCount);

    if (existing) {
      await prisma.cardType.update({
        where: { id: existing.id },
        data: {
          name,
          noonesPaymentMethod: method.slug,
          offerCount,
          active: publishable,
        },
      });
      if (!publishable) {
        await prisma.rate.updateMany({ where: { cardTypeId: existing.id }, data: { active: false } });
        await prisma.landingPage.updateMany({
          where: { cardTypeId: existing.id },
          data: { published: false },
        });
      }
    } else {
      await prisma.cardType.create({
        data: {
          name,
          slug,
          sellSlug: sellSlug(name),
          noonesPaymentMethod: method.slug,
          offerCount,
          active: publishable,
        },
      });
    }
    count++;
    await sleep(50);
  }

  return count;
}

async function upsertRateFromNoOnes(
  cardTypeId: string,
  target: RateSyncTarget,
  nairaPerUnit: number,
  storedQuotes: StoredQuotes
): Promise<"created" | "updated"> {
  const existing = await prisma.rate.findFirst({
    where: {
      cardTypeId,
      country: target.country,
      medium: target.medium,
      minDenom: target.minDenom,
      maxDenom: target.maxDenom,
    },
  });

  const data = {
    nairaPerUnit: new Prisma.Decimal(nairaPerUnit.toFixed(4)),
    storedQuotes: storedQuotesToJson(storedQuotes),
    currency: target.currency,
    speed: "NOONES",
    active: true,
  };

  if (existing) {
    await prisma.rate.update({ where: { id: existing.id }, data });
    return "updated";
  }

  await prisma.rate.create({
    data: {
      cardTypeId,
      country: target.country,
      minDenom: target.minDenom,
      maxDenom: target.maxDenom,
      medium: target.medium,
      ...data,
    },
  });
  return "created";
}

async function syncCardTypeRates(
  card: { id: string; slug: string; name: string; noonesPaymentMethod: string | null },
  summary: RateSyncSummary,
  options?: { hydrationOnly?: boolean }
): Promise<void> {
  const paymentMethod = resolvePaymentMethodSlug(card.slug, card.name, card.noonesPaymentMethod);
  if (!paymentMethod) {
    summary.skipped++;
    summary.errors.push(`${card.name}: no payment-method mapping`);
    return;
  }

  try {
    const offerCount = await countNoOnesOffers(paymentMethod);
    const publishable = isCardPublishable(offerCount);
    await prisma.cardType.update({ where: { id: card.id }, data: { offerCount, active: publishable } });

    if (!publishable) {
      await prisma.rate.updateMany({ where: { cardTypeId: card.id }, data: { active: false } });
      await prisma.landingPage.updateMany({
        where: { cardTypeId: card.id },
        data: { published: false },
      });
      summary.drafted++;
      summary.skipped++;
      return;
    }

    summary.published++;
  } catch (err) {
    summary.errors.push(`${card.name}: offer count — ${(err as Error).message}`);
    return;
  }

  const existingRates = await prisma.rate.findMany({ where: { cardTypeId: card.id } });
  let targets = buildSyncTargets(existingRates, options);

  try {
    const discovered = await discoverOfferCurrencies(paymentMethod);
    targets = appendDiscoveredCurrencyTargets(targets, discovered);
  } catch (err) {
    summary.errors.push(`${card.name}: currency discovery — ${(err as Error).message}`);
  }
  const { noonesRateRefreshMinutes } = await getRateConfig();

  for (const target of targets) {
    try {
      const existing = await prisma.rate.findFirst({
        where: {
          cardTypeId: card.id,
          country: target.country,
          medium: target.medium,
          minDenom: target.minDenom,
          maxDenom: target.maxDenom,
        },
      });

      if (existing && isRateSyncFresh(existing.updatedAt, noonesRateRefreshMinutes)) {
        summary.skipped++;
        continue;
      }

      const { storedQuotes, nairaPerUnit } = await fetchStoredQuotesForTarget({
        paymentMethod,
        cardCurrency: target.currency,
        cardAmount: target.sampleAmount,
        medium: target.medium as CardMedium,
        otherCountriesOnly: target.country === "Other",
      });

      if (!nairaPerUnit || nairaPerUnit <= 0) {
        summary.skipped++;
        continue;
      }

      const result = await upsertRateFromNoOnes(card.id, target, nairaPerUnit, storedQuotes);
      if (result === "created") summary.created++;
      else summary.updated++;

      await sleep(150);
    } catch (err) {
      summary.errors.push(
        `${card.name}/${target.country}/${target.medium}: ${(err as Error).message}`
      );
    }
  }

  // Sync "Other" country tier only when live offers accept non-standard countries.
  try {
    const otherOffersExist = await hasOtherCountryOffers(paymentMethod);
    if (otherOffersExist) {
      for (const medium of ["PHYSICAL", "ECODE"] as CardMedium[]) {
        const otherTarget: RateSyncTarget = { ...OTHER_COUNTRY_TIER, medium };
        const existing = await prisma.rate.findFirst({
          where: {
            cardTypeId: card.id,
            country: "Other",
            medium,
            minDenom: null,
            maxDenom: null,
          },
        });

        if (existing && isRateSyncFresh(existing.updatedAt, noonesRateRefreshMinutes)) {
          summary.skipped++;
          continue;
        }

        const { storedQuotes, nairaPerUnit } = await fetchStoredQuotesForTarget({
          paymentMethod,
          cardCurrency: OTHER_COUNTRY_TIER.currency,
          cardAmount: OTHER_COUNTRY_TIER.sampleAmount,
          medium,
          otherCountriesOnly: true,
        });

        if (!nairaPerUnit || nairaPerUnit <= 0) {
          if (existing) {
            await prisma.rate.update({ where: { id: existing.id }, data: { active: false } });
          }
          summary.skipped++;
          continue;
        }

        const result = await upsertRateFromNoOnes(card.id, otherTarget, nairaPerUnit, storedQuotes);
        if (result === "created") summary.created++;
        else summary.updated++;
        await sleep(150);
      }
    } else {
      await prisma.rate.updateMany({
        where: { cardTypeId: card.id, country: "Other" },
        data: { active: false },
      });
    }
  } catch (err) {
    summary.errors.push(`${card.name}/Other: ${(err as Error).message}`);
  }
}

/**
 * Generate all rates from NoOnes: existing rows, missing cards, PHYSICAL + ECODE tiers.
 */
export async function syncRatesFromNoOnes(): Promise<RateSyncSummary> {
  const summary: RateSyncSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    drafted: 0,
    published: 0,
    cardTypes: 0,
    errors: [],
  };

  if (!isNoOnesConfigured()) return summary;

  try {
    await ensureCardTypesFromNoOnes();
  } catch (err) {
    summary.errors.push(`Card type discovery: ${(err as Error).message}`);
  }

  const cardTypes = await prisma.cardType.findMany({ orderBy: { name: "asc" } });
  summary.cardTypes = cardTypes.length;

  for (const card of cardTypes) {
    await syncCardTypeRates(card, summary);
  }

  return summary;
}

/** Pull live NoOnes rates for one card when its page would otherwise show none. */
export async function hydrateCardRatesFromNoOnes(cardTypeId: string): Promise<number> {
  if (!isNoOnesConfigured()) return 0;

  const card = await prisma.cardType.findUnique({ where: { id: cardTypeId } });
  if (!card) return 0;

  const summary: RateSyncSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    drafted: 0,
    published: 0,
    cardTypes: 1,
    errors: [],
  };

  await syncCardTypeRates(card, summary, { hydrationOnly: true });
  return summary.created + summary.updated;
}

/** Discover all payment methods (admin debugging). */
export async function listNoOnesPaymentMethods(): Promise<{ name: string; slug: string }[]> {
  return listGiftCardPaymentMethods();
}

/** Preview best offer for a rate row without persisting. */
export async function previewRateFromNoOnes(rateId: string) {
  const rate = await prisma.rate.findUnique({
    where: { id: rateId },
    include: { cardType: true },
  });
  if (!rate) throw new Error("Rate not found");

  const paymentMethod = resolvePaymentMethodSlug(
    rate.cardType.slug,
    rate.cardType.name,
    rate.cardType.noonesPaymentMethod
  );
  if (!paymentMethod) throw new Error("No payment method mapping for this card type");

  const amount =
    rate.maxDenom && rate.minDenom
      ? Math.round((rate.minDenom + rate.maxDenom) / 2)
      : rate.maxDenom || rate.minDenom || 100;

  return fetchAverageOfferForMedium({
    paymentMethod,
    cardCurrency: rate.currency,
    cardAmount: amount,
    medium: rate.medium,
  });
}
