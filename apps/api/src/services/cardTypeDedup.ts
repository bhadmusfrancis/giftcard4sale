import { CardType, Prisma } from "@prisma/client";
import { canonicalCardSlug, cardBrandKey, normalizeCardTypeName, sellSlug } from "@gc4s/shared";
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

/**
 * Pick the card to keep when two rows represent the same brand: the plainest
 * name ("Dicks" over "Dicks Gift Cards") — the one the rate sources produce
 * now, so later syncs keep matching it by slug.
 */
export function pickKeeperCard(cards: CardTypeWithCounts[]): CardTypeWithCounts {
  const canonical = cards.filter((c) => c.slug === canonicalCardSlug(c.name));
  const pool = canonical.length ? canonical : cards;

  return [...pool].sort((a, b) => {
    const plain = normalizeCardTypeName(a.name).length - normalizeCardTypeName(b.name).length;
    if (plain) return plain;
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
    const key = cardBrandKey(card.name);
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

  // Insight posts cascade with the card, so carry over the days the keeper has
  // no post for. Currency meta is left to cascade: the next sync rewrites it
  // for every currency the moved rates cover, and the card page reads ranges
  // from the rate rows meanwhile.
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

/** Fold `dups` into `keeper`, keeping any admin-set details only a duplicate had. */
async function mergeCardGroup(keeper: CardType, dups: CardType[], summary: DedupSummary): Promise<void> {
  if (!dups.length) return;
  for (const dup of dups) {
    const { ratesMoved, ratesDropped } = await absorbCardType(keeper.id, dup.id);
    summary.merged.push({
      keeper: `${keeper.name} (${keeper.slug})`,
      removed: `${dup.name} (${dup.slug})`,
      ratesMoved,
      ratesDropped,
    });
  }
  const pick = <K extends keyof CardType>(key: K) => keeper[key] ?? dups.find((d) => d[key] != null)?.[key] ?? null;
  await prisma.cardType.update({
    where: { id: keeper.id },
    data: {
      name: normalizeCardTypeName(keeper.name),
      noonesPaymentMethod: pick("noonesPaymentMethod"),
      description: pick("description"),
      imageUrl: pick("imageUrl"),
      nairaReductionPercent: pick("nairaReductionPercent"),
      usdtReductionPercent: pick("usdtReductionPercent"),
      ghsReductionPercent: pick("ghsReductionPercent"),
      forceActive: keeper.forceActive || dups.some((d) => d.forceActive),
    },
  });
  await refreshCardCatalogVisibility(keeper.id);
}

/**
 * Brands no name rule can join — "Dicks" from Sogo, "Dick's Sporting Goods"
 * from SafeTheTrade. Keyed by the slug of the card to keep; the sync's name
 * aliases route both sources to it after.
 */
const CARD_MERGES: Record<string, string[]> = {
  dicks: ["dick-s-sporting-goods", "dicks-sporting-goods"],
  roblox: ["roblox-game-card"],
  footlocker: ["footlocker-sports", "foot-locker"],
};

/** Fold the cards listed in `CARD_MERGES` into their keeper. A no-op once merged. */
export async function mergeAliasedCardTypes(): Promise<DedupSummary> {
  const summary: DedupSummary = { merged: [] };
  for (const [keeperSlug, aliasSlugs] of Object.entries(CARD_MERGES)) {
    const keeper = await prisma.cardType.findUnique({ where: { slug: keeperSlug } });
    if (!keeper) continue;
    const dups = await prisma.cardType.findMany({ where: { slug: { in: aliasSlugs } } });
    await mergeCardGroup(keeper, dups, summary);
  }
  return summary;
}

export interface DedupSummary {
  merged: { keeper: string; removed: string; ratesMoved: number; ratesDropped: number }[];
}

/**
 * Merge duplicate card types of the same brand (`cardBrandKey`) — e.g. an old
 * NoOnes-imported "CASHlib Vouchers" beside SafeTheTrade's "CASHlib Voucher" —
 * then the explicit `CARD_MERGES`. Runs on boot; a no-op once merged.
 */
export async function dedupeCardTypes(): Promise<DedupSummary> {
  const cards = await prisma.cardType.findMany({
    include: { _count: { select: { rates: true, trades: true } } },
  });

  const summary: DedupSummary = { merged: [] };
  for (const [, members] of groupDuplicateCardTypes(cards)) {
    if (members.length < 2) continue;
    const fullMembers = members.map((m) => cards.find((c) => c.id === m.id)!);
    const keeper = pickKeeperCard(fullMembers);
    await mergeCardGroup(
      keeper,
      fullMembers.filter((c) => c.id !== keeper.id),
      summary
    );
  }

  const aliased = await mergeAliasedCardTypes();
  summary.merged.push(...aliased.merged);
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
