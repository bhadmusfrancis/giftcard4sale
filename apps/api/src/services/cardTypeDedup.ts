import { CardType, Prisma } from "@prisma/client";
import { canonicalCardSlug, normalizeCardTypeName, sellSlug } from "@gc4s/shared";
import { prisma } from "../prisma";
import { refreshCardCatalogVisibility } from "./cardVisibility";
import { paymentMethodToCardName } from "./noones/rateCatalog";
import { SYNCED_RATE_SPEEDS, weakerRateSources } from "./rateSources";

type CardTypeWithCounts = CardType & { _count: { rates: number; trades: number } };

function rateKey(r: {
  country: string;
  medium: string;
  minDenom: number | null;
  maxDenom: number | null;
}): string {
  return [r.country, r.medium, r.minDenom ?? "", r.maxDenom ?? ""].join("|");
}

/** Pick the card to keep when two rows represent the same brand. */
export function pickKeeperCard(cards: CardTypeWithCounts[]): CardTypeWithCounts {
  const canonical = cards.filter((c) => c.slug === canonicalCardSlug(c.name));
  const candidates = canonical.length ? canonical : cards.filter((c) => !c.slug.endsWith("-gift-card"));
  const pool = candidates.length ? candidates : cards;

  return [...pool].sort((a, b) => {
    if (b._count.rates !== a._count.rates) return b._count.rates - a._count.rates;
    if (b._count.trades !== a._count.trades) return b._count.trades - a._count.trades;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

export function groupDuplicateCardTypes(
  cards: Pick<CardType, "id" | "name" | "slug">[]
): Map<string, Pick<CardType, "id" | "name" | "slug">[]> {
  const groups = new Map<string, Pick<CardType, "id" | "name" | "slug">[]>();
  for (const card of cards) {
    const key = canonicalCardSlug(card.name);
    const list = groups.get(key) ?? [];
    list.push(card);
    groups.set(key, list);
  }
  return groups;
}

/** Find an existing card type that matches a NoOnes payment method or canonical name. */
export async function findExistingCardType(
  method: { slug: string; name?: string },
  tx: Prisma.TransactionClient = prisma
) {
  const name = paymentMethodToCardName(method.slug, method.name);
  const slug = canonicalCardSlug(name);

  return tx.cardType.findFirst({
    where: {
      OR: [
        { noonesPaymentMethod: method.slug },
        { slug },
        { name: { equals: name, mode: "insensitive" } },
        { name: { equals: `${name} Gift Card`, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Move everything a duplicate card owns onto the keeper, then delete it. Rate
 * rows the keeper already has for the same tier and band are dropped.
 */
async function absorbCardType(keeperId: string, dupId: string): Promise<{ ratesMoved: number; ratesDropped: number }> {
  let ratesMoved = 0;
  let ratesDropped = 0;

  const keeperRates = await prisma.rate.findMany({ where: { cardTypeId: keeperId } });
  const keeperKeys = new Set(keeperRates.map(rateKey));
  const dupRates = await prisma.rate.findMany({ where: { cardTypeId: dupId } });

  for (const rate of dupRates) {
    const key = rateKey(rate);
    if (keeperKeys.has(key)) {
      await prisma.rate.delete({ where: { id: rate.id } });
      ratesDropped++;
    } else {
      await prisma.rate.update({ where: { id: rate.id }, data: { cardTypeId: keeperId } });
      keeperKeys.add(key);
      ratesMoved++;
    }
  }

  await prisma.trade.updateMany({ where: { cardTypeId: dupId }, data: { cardTypeId: keeperId } });

  const dupLanding = await prisma.landingPage.findUnique({ where: { cardTypeId: dupId } });
  if (dupLanding) {
    const keeperLanding = await prisma.landingPage.findUnique({ where: { cardTypeId: keeperId } });
    if (keeperLanding) {
      await prisma.landingPage.delete({ where: { id: dupLanding.id } });
    } else {
      await prisma.landingPage.update({ where: { id: dupLanding.id }, data: { cardTypeId: keeperId } });
    }
  }

  // Currency meta and insight posts cascade with the card, so carry over what
  // the keeper does not already have.
  const keeperCurrencies = new Set(
    (await prisma.cardCurrencyMeta.findMany({ where: { cardTypeId: keeperId }, select: { currency: true } })).map(
      (m) => m.currency
    )
  );
  for (const meta of await prisma.cardCurrencyMeta.findMany({ where: { cardTypeId: dupId } })) {
    if (keeperCurrencies.has(meta.currency)) continue;
    await prisma.cardCurrencyMeta.update({ where: { id: meta.id }, data: { cardTypeId: keeperId } });
  }
  const keeperBatches = new Set(
    (await prisma.insightPost.findMany({ where: { cardTypeId: keeperId }, select: { batchDate: true } })).map((p) =>
      p.batchDate.getTime()
    )
  );
  for (const post of await prisma.insightPost.findMany({ where: { cardTypeId: dupId } })) {
    if (keeperBatches.has(post.batchDate.getTime())) continue;
    await prisma.insightPost.update({ where: { id: post.id }, data: { cardTypeId: keeperId } });
  }

  // The two cards may each have held a live rate for the same currency and
  // medium; only the strongest source's row may keep quoting.
  const active = await prisma.rate.findMany({
    where: { cardTypeId: keeperId, active: true, speed: { in: SYNCED_RATE_SPEEDS } },
    select: { currency: true, medium: true, speed: true },
  });
  for (const row of active) {
    const weaker = weakerRateSources(row.speed!);
    if (!weaker.length) continue;
    await prisma.rate.updateMany({
      where: { cardTypeId: keeperId, currency: row.currency, medium: row.medium, active: true, speed: { in: weaker } },
      data: { active: false },
    });
  }

  await prisma.cardType.delete({ where: { id: dupId } });
  return { ratesMoved, ratesDropped };
}

/**
 * Brands that reach the catalog under names no slug rule can join — "Dicks"
 * from Sogo, "Dick's Sporting Goods" from SafeTheTrade. Keyed by the slug of
 * the card to keep; the sync's name aliases route both sources to it after.
 */
const CARD_MERGES: Record<string, string[]> = {
  dicks: ["dick-s-sporting-goods", "dicks-sporting-goods"],
};

/** Fold the cards listed in `CARD_MERGES` into their keeper. Runs on boot; a no-op once merged. */
export async function mergeAliasedCardTypes(): Promise<DedupSummary> {
  const summary: DedupSummary = { merged: [] };
  for (const [keeperSlug, aliasSlugs] of Object.entries(CARD_MERGES)) {
    const keeper = await prisma.cardType.findUnique({ where: { slug: keeperSlug } });
    if (!keeper) continue;
    const dups = await prisma.cardType.findMany({ where: { slug: { in: aliasSlugs } } });
    for (const dup of dups) {
      const { ratesMoved, ratesDropped } = await absorbCardType(keeper.id, dup.id);
      if (!keeper.noonesPaymentMethod && dup.noonesPaymentMethod) {
        await prisma.cardType.update({ where: { id: keeper.id }, data: { noonesPaymentMethod: dup.noonesPaymentMethod } });
      }
      summary.merged.push({
        keeper: `${keeper.name} (${keeper.slug})`,
        removed: `${dup.name} (${dup.slug})`,
        ratesMoved,
        ratesDropped,
      });
    }
    if (dups.length) await refreshCardCatalogVisibility(keeper.id);
  }
  return summary;
}

export interface DedupSummary {
  merged: { keeper: string; removed: string; ratesMoved: number; ratesDropped: number }[];
}

/** Merge duplicate card types that share the same canonical brand name. */
export async function dedupeCardTypes(): Promise<DedupSummary> {
  const cards = await prisma.cardType.findMany({
    include: { _count: { select: { rates: true, trades: true } } },
  });

  const summary: DedupSummary = { merged: [] };
  const groups = groupDuplicateCardTypes(cards);

  for (const [, members] of groups) {
    if (members.length < 2) continue;

    const fullMembers = members.map((m) => cards.find((c) => c.id === m.id)!);
    const keeper = pickKeeperCard(fullMembers);
    const duplicates = fullMembers.filter((c) => c.id !== keeper.id);
    const canonicalName = normalizeCardTypeName(keeper.name);

    for (const dup of duplicates) {
      const { ratesMoved, ratesDropped } = await absorbCardType(keeper.id, dup.id);

      await prisma.cardType.update({
        where: { id: keeper.id },
        data: {
          name: canonicalName,
          noonesPaymentMethod: keeper.noonesPaymentMethod ?? dup.noonesPaymentMethod,
          active: true,
        },
      });

      summary.merged.push({
        keeper: `${keeper.name} (${keeper.slug})`,
        removed: `${dup.name} (${dup.slug})`,
        ratesMoved,
        ratesDropped,
      });
    }
  }

  return summary;
}

/** Fix card slugs that duplicated the "-gift-card" suffix (e.g. sell-h-m-gift-card-gift-card). */
export async function repairCardSlugSuffixes(): Promise<number> {
  const cards = await prisma.cardType.findMany({
    select: { id: true, name: true, slug: true, sellSlug: true },
  });

  let updated = 0;
  for (const card of cards) {
    const slug = canonicalCardSlug(card.name);
    const sell = sellSlug(card.name);
    if (card.slug === slug && card.sellSlug === sell) continue;

    const conflict = await prisma.cardType.findFirst({
      where: {
        OR: [{ slug }, { sellSlug: sell }],
        NOT: { id: card.id },
      },
      select: { id: true },
    });
    if (conflict) continue;

    await prisma.cardType.update({
      where: { id: card.id },
      data: { slug, sellSlug: sell },
    });
    updated++;
  }

  const badLandingSlugs = await prisma.landingPage.findMany({
    where: { slug: { endsWith: "-gift-card-gift-card" } },
    select: { id: true, slug: true },
  });
  for (const page of badLandingSlugs) {
    const fixed = page.slug.replace(/-gift-card-gift-card$/, "-gift-card");
    const taken = await prisma.landingPage.findFirst({
      where: { slug: fixed, NOT: { id: page.id } },
      select: { id: true },
    });
    if (!taken) {
      await prisma.landingPage.update({ where: { id: page.id }, data: { slug: fixed } });
      updated++;
    }
  }

  return updated;
}

/** Rename legacy Germany EUR tiers to the pan-European Euro label. */
export async function repairEuroCountryLabels(): Promise<number> {
  const rates = await prisma.rate.updateMany({
    where: { country: "Germany", currency: "EUR" },
    data: { country: "Euro" },
  });
  const meta = await prisma.cardCurrencyMeta.updateMany({
    where: { country: "Germany", currency: "EUR" },
    data: { country: "Euro" },
  });
  return rates.count + meta.count;
}
