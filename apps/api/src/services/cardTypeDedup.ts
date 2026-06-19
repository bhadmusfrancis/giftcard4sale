import { CardType, Prisma } from "@prisma/client";
import { canonicalCardSlug, normalizeCardTypeName, sellSlug } from "@gc4s/shared";
import { prisma } from "../prisma";
import { paymentMethodToCardName } from "./noones/rateCatalog";

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
      let ratesMoved = 0;
      let ratesDropped = 0;

      const keeperRates = await prisma.rate.findMany({ where: { cardTypeId: keeper.id } });
      const keeperKeys = new Set(keeperRates.map(rateKey));
      const dupRates = await prisma.rate.findMany({ where: { cardTypeId: dup.id } });

      for (const rate of dupRates) {
        const key = rateKey(rate);
        if (keeperKeys.has(key)) {
          await prisma.rate.delete({ where: { id: rate.id } });
          ratesDropped++;
        } else {
          await prisma.rate.update({
            where: { id: rate.id },
            data: { cardTypeId: keeper.id },
          });
          keeperKeys.add(key);
          ratesMoved++;
        }
      }

      await prisma.trade.updateMany({
        where: { cardTypeId: dup.id },
        data: { cardTypeId: keeper.id },
      });

      const dupLanding = await prisma.landingPage.findUnique({ where: { cardTypeId: dup.id } });
      if (dupLanding) {
        const keeperLanding = await prisma.landingPage.findUnique({ where: { cardTypeId: keeper.id } });
        if (keeperLanding) {
          await prisma.landingPage.delete({ where: { id: dupLanding.id } });
        } else {
          await prisma.landingPage.update({
            where: { id: dupLanding.id },
            data: { cardTypeId: keeper.id },
          });
        }
      }

      await prisma.cardType.update({
        where: { id: keeper.id },
        data: {
          name: canonicalName,
          noonesPaymentMethod: keeper.noonesPaymentMethod ?? dup.noonesPaymentMethod,
          active: true,
        },
      });

      await prisma.cardType.delete({ where: { id: dup.id } });

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
