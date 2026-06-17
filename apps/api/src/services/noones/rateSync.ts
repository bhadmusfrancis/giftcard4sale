import { CardMedium, Prisma } from "@prisma/client";
import { canonicalCardSlug, sellSlug } from "@gc4s/shared";
import { prisma } from "../../prisma";
import { findExistingCardType } from "../cardTypeDedup";
import { isNoOnesConfigured, noonesPost } from "./client";
import { resolvePaymentMethodSlug } from "./paymentMethods";
import { buildSyncTargets, paymentMethodToCardName, RateSyncTarget } from "./rateCatalog";
import { fetchBestOfferForMedium } from "./rates";

export interface RateSyncSummary {
  created: number;
  updated: number;
  skipped: number;
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

    if (existing) {
      await prisma.cardType.update({
        where: { id: existing.id },
        data: {
          name,
          noonesPaymentMethod: method.slug,
          active: true,
        },
      });
    } else {
      await prisma.cardType.create({
        data: {
          name,
          slug,
          sellSlug: sellSlug(name),
          noonesPaymentMethod: method.slug,
          active: true,
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
  nairaPerUnit: number
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
  summary: RateSyncSummary
): Promise<void> {
  const paymentMethod = resolvePaymentMethodSlug(card.slug, card.name, card.noonesPaymentMethod);
  if (!paymentMethod) {
    summary.skipped++;
    summary.errors.push(`${card.name}: no payment-method mapping`);
    return;
  }

  const existingRates = await prisma.rate.findMany({ where: { cardTypeId: card.id } });
  const targets = buildSyncTargets(existingRates);

  for (const target of targets) {
    try {
      const market = await fetchBestOfferForMedium({
        paymentMethod,
        cardCurrency: target.currency,
        cardAmount: target.sampleAmount,
        medium: target.medium as CardMedium,
      });

      if (!market?.nairaPerUnit || market.nairaPerUnit <= 0) {
        summary.skipped++;
        continue;
      }

      const result = await upsertRateFromNoOnes(card.id, target, market.nairaPerUnit);
      if (result === "created") summary.created++;
      else summary.updated++;

      await sleep(150);
    } catch (err) {
      summary.errors.push(
        `${card.name}/${target.country}/${target.medium}: ${(err as Error).message}`
      );
    }
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
    cardTypes: 0,
    errors: [],
  };

  if (!isNoOnesConfigured()) return summary;

  try {
    await ensureCardTypesFromNoOnes();
  } catch (err) {
    summary.errors.push(`Card type discovery: ${(err as Error).message}`);
  }

  const cardTypes = await prisma.cardType.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  summary.cardTypes = cardTypes.length;

  for (const card of cardTypes) {
    await syncCardTypeRates(card, summary);
  }

  return summary;
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

  return fetchBestOfferForMedium({
    paymentMethod,
    cardCurrency: rate.currency,
    cardAmount: amount,
    medium: rate.medium,
  });
}
