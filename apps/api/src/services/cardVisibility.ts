import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { isCardPublishable } from "./noones/publishPolicy";
import { noonesLinkedCardWhere } from "./noones/exclusions";

/** Rates imported from pasted rate text (not synced from NoOnes). */
export const MANUAL_RATE_WHERE: Prisma.RateWhereInput = {
  OR: [{ speed: null }, { speed: { in: ["SLOW", "FAST"] } }],
};

export function isManualRateSpeed(speed: string | null | undefined): boolean {
  return speed == null || speed === "SLOW" || speed === "FAST";
}

/** Public catalog: NoOnes cards that have at least one quotable rate row. */
export function noOnesCatalogWhere(): Prisma.CardTypeWhereInput {
  return {
    ...noonesLinkedCardWhere(),
    active: true,
    rates: { some: { active: true } },
  };
}

/** Whether a card should appear in the public catalog (has quotable rates). */
export async function cardHasQuotableRates(cardTypeId: string): Promise<boolean> {
  const activeRates = await prisma.rate.count({
    where: { cardTypeId, active: true },
  });
  return activeRates > 0;
}

/** Sync card.active from active rate rows. SEO landing pages stay published even when a card is inactive. */
export async function refreshCardCatalogVisibility(cardTypeId: string): Promise<boolean> {
  const activeRates = await prisma.rate.count({ where: { cardTypeId, active: true } });

  const visible = activeRates > 0;
  const card = await prisma.cardType.findUnique({
    where: { id: cardTypeId },
    select: { active: true },
  });

  if (card && card.active !== visible) {
    await prisma.cardType.update({ where: { id: cardTypeId }, data: { active: visible } });
  }

  return visible;
}

/** SEO landing pages stay live for every card type, even when the trade catalog is inactive. */
export async function ensureCardSeoLandingPagesPublished(): Promise<number> {
  const result = await prisma.landingPage.updateMany({
    where: { cardTypeId: { not: null }, published: false },
    data: { published: true },
  });
  return result.count;
}

export function catalogCardWhere(search?: string): Prisma.CardTypeWhereInput {
  const visibility = noOnesCatalogWhere();

  if (!search) return visibility;

  return {
    AND: [
      visibility,
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ],
  };
}

/** Apply NoOnes publish rules without deactivating manually imported rates. */
export async function applyNoOnesPublishState(
  cardTypeId: string,
  offerCount: number,
  offerCountKnown: boolean,
  tradeVolume = 0
): Promise<{ publishable: boolean; drafted: boolean }> {
  if (!offerCountKnown) {
    const card = await prisma.cardType.findUnique({ where: { id: cardTypeId } });
    return { publishable: card?.active ?? false, drafted: false };
  }

  const manualActive = await prisma.rate.count({
    where: { cardTypeId, active: true, ...MANUAL_RATE_WHERE },
  });
  const publishable = isCardPublishable(offerCount);

  await prisma.cardType.update({
    where: { id: cardTypeId },
    data: {
      offerCount,
      tradeVolume,
      // Only force active when manual rates exist; otherwise wait for rate sync.
      ...(publishable ? {} : { active: manualActive > 0 }),
    },
  });

  if (!publishable) {
    await prisma.rate.updateMany({
      where: { cardTypeId, speed: "NOONES" },
      data: { active: false },
    });
    return { publishable: manualActive > 0, drafted: true };
  }

  return { publishable: true, drafted: false };
}

/** Restore manually imported rates that NoOnes sync previously deactivated. */
export async function repairManualRateCatalog(): Promise<number> {
  const manualRates = await prisma.rate.findMany({
    where: MANUAL_RATE_WHERE,
    select: { id: true, cardTypeId: true, active: true },
  });

  let repaired = 0;
  const cardIds = new Set<string>();

  for (const rate of manualRates) {
    cardIds.add(rate.cardTypeId);
    if (!rate.active) {
      await prisma.rate.update({ where: { id: rate.id }, data: { active: true } });
      repaired++;
    }
  }

  for (const cardTypeId of cardIds) {
    const hasActiveManual = await prisma.rate.count({
      where: { cardTypeId, active: true, ...MANUAL_RATE_WHERE },
    });
    if (hasActiveManual > 0) {
      await prisma.cardType.update({ where: { id: cardTypeId }, data: { active: true } });
    }
  }

  return repaired;
}

/** Align stored offer counts with publish flags (no NoOnes API calls). */
export async function syncNoOnesCatalogVisibilityFromStored(): Promise<{
  published: number;
  drafted: number;
}> {
  let published = 0;
  let drafted = 0;

  const cards = await prisma.cardType.findMany({
    where: noonesLinkedCardWhere(),
    select: { id: true, offerCount: true, active: true },
  });

  for (const card of cards) {
    const wasActive = card.active;
    const visible = await refreshCardCatalogVisibility(card.id);
    if (visible && !wasActive) published++;
    else if (!visible && wasActive) drafted++;
  }

  return { published, drafted };
}
