import { CardMedium, Prisma } from "@prisma/client";
import { canonicalCardSlug, sellSlug, StoredQuotes } from "@gc4s/shared";
import { prisma } from "../../prisma";
import { findExistingCardType } from "../cardTypeDedup";
import { ensureCardSeoLandingPagesPublished, isManualRateSpeed, refreshCardCatalogVisibility } from "../cardVisibility";
import { persistCardCurrencyMeta } from "../noones/currencyMeta";
import { resolvePaymentMethodSlug } from "../noones/paymentMethods";
import { storedQuotesToJson } from "../noones/storedQuotes";
import type { RateSyncSummary } from "../noones/rateSync";
import {
  addNoOnesSyncErrors,
  isNoOnesSyncActive,
  mergeNoOnesSyncSummary,
  setNoOnesSyncCurrentCard,
  setNoOnesSyncPhase,
  setNoOnesSyncTotalCards,
} from "../noones/syncStatus";
import { fetchSogoGiftCardRates, SOGO_RATE_SPEED, type SogoCardRates, type SogoCurrencyRate } from "./scraper";
import { loadPartnerLastTradedRates, PARTNER_RATE_SPEED, type PartnerLastRate } from "./partnerFallback";

const SOGO_COVERED_OFFERS = 999;

const NAME_ALIASES: Record<string, string[]> = {
  "apple-itunes": ["itunes", "apple", "apple-us-only", "apple-gift-card-us-only"],
  itunes: ["apple-itunes", "apple", "apple-us-only"],
  "apple-us-only": ["apple-itunes", "itunes"],
  apple: ["apple-itunes", "itunes"],
  steam: ["steam-wallet", "steam-wallet-gift-card"],
  xbox: ["x-box"],
  playstation: ["playstation-network", "psn"],
  "google-play": ["google"],
  footlocker: ["foot-locker"],
  macys: ["macy-s", "macys"],
  vanilla: ["vanilla-visa"],
  visa: ["visa-gift-card"],
  "american-express": ["amex"],
  dicks: ["dicks-sporting-goods"],
  "dicks-sporting-goods": ["dicks"],
};

function emptySummary(): RateSyncSummary {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
    deleted: 0,
    drafted: 0,
    published: 0,
    cardTypes: 0,
    errors: [],
  };
}

function aliasSlugs(slug: string): string[] {
  const extra = NAME_ALIASES[slug] ?? [];
  return [slug, ...extra];
}

async function findCardByName(name: string, slugHint?: string) {
  const slug = canonicalCardSlug(name);
  const aliases = [...new Set([slug, ...(slugHint ? aliasSlugs(canonicalCardSlug(slugHint)) : []), ...aliasSlugs(slug)])];
  const paymentGuess = resolvePaymentMethodSlug(slug, name);

  const existing = await prisma.cardType.findFirst({
    where: {
      OR: [
        { slug: { in: aliases } },
        { name: { equals: name, mode: "insensitive" } },
        { name: { equals: `${name} Gift Card`, mode: "insensitive" } },
        ...(paymentGuess ? [{ noonesPaymentMethod: paymentGuess }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  if (paymentGuess) {
    const byMethod = await findExistingCardType({ slug: paymentGuess, name });
    if (byMethod) return byMethod;
  }
  return null;
}

async function ensureCardType(name: string, slugHint?: string) {
  const existing = await findCardByName(name, slugHint);
  const slug = existing?.slug || canonicalCardSlug(name);
  const paymentMethod = existing?.noonesPaymentMethod || resolvePaymentMethodSlug(slug, name);
  if (existing) {
    if (!existing.noonesPaymentMethod && paymentMethod) {
      return prisma.cardType.update({
        where: { id: existing.id },
        data: { noonesPaymentMethod: paymentMethod },
      });
    }
    return existing;
  }

  return prisma.cardType.create({
    data: {
      name,
      slug,
      sellSlug: sellSlug(name),
      noonesPaymentMethod: paymentMethod,
      active: true,
      offerCount: SOGO_COVERED_OFFERS,
    },
  });
}

async function upsertSyncedRate(params: {
  cardTypeId: string;
  country: string;
  currency: string;
  medium: CardMedium;
  minDenom: number;
  maxDenom: number;
  nairaPerUnit: number;
  storedQuotes: StoredQuotes;
  speed: typeof SOGO_RATE_SPEED | typeof PARTNER_RATE_SPEED;
  summary: RateSyncSummary;
}): Promise<void> {
  const {
    cardTypeId,
    country,
    currency,
    medium,
    minDenom,
    maxDenom,
    nairaPerUnit,
    storedQuotes,
    speed,
    summary,
  } = params;

  const manual = await prisma.rate.findFirst({
    where: {
      cardTypeId,
      country,
      medium,
      OR: [{ speed: null }, { speed: { in: ["SLOW", "FAST"] } }],
    },
  });
  if (manual && isManualRateSpeed(manual.speed)) {
    summary.skipped++;
    return;
  }

  const existing = await prisma.rate.findFirst({
    where: { cardTypeId, country, medium, speed },
  });

  const data = {
    currency,
    minDenom,
    maxDenom,
    nairaPerUnit: new Prisma.Decimal(nairaPerUnit.toFixed(4)),
    storedQuotes: storedQuotesToJson(storedQuotes),
    countryOfferCount: SOGO_COVERED_OFFERS,
    speed,
    active: true,
  };

  if (existing) {
    await prisma.rate.update({ where: { id: existing.id }, data });
    summary.updated++;
  } else {
    await prisma.rate.create({
      data: {
        cardTypeId,
        country,
        medium,
        ...data,
      },
    });
    summary.created++;
  }

  await prisma.rate.updateMany({
    where: {
      cardTypeId,
      country,
      medium,
      speed: { in: speed === SOGO_RATE_SPEED ? ["NOONES", PARTNER_RATE_SPEED] : ["NOONES"] },
    },
    data: { active: false },
  });
}

async function persistCurrencyMeta(
  cardTypeId: string,
  rows: Array<{ country: string; currency: string; minDenom: number; maxDenom: number }>
): Promise<void> {
  const byCurrency = new Map<string, { country: string; currency: string; minDenom: number; maxDenom: number }>();
  for (const row of rows) {
    const prev = byCurrency.get(row.currency);
    if (!prev) {
      byCurrency.set(row.currency, row);
      continue;
    }
    prev.minDenom = Math.min(prev.minDenom, row.minDenom);
    prev.maxDenom = Math.max(prev.maxDenom, row.maxDenom);
  }
  for (const row of byCurrency.values()) {
    await persistCardCurrencyMeta(cardTypeId, row.country, row.currency, {
      offerCount: SOGO_COVERED_OFFERS,
      ranges: [{ min: row.minDenom, max: row.maxDenom }],
    });
  }
}

function sogoCoveredKeys(cards: SogoCardRates[]): Set<string> {
  const keys = new Set<string>();
  for (const card of cards) {
    const slugs = aliasSlugs(canonicalCardSlug(card.name));
    if (card.slugHint) slugs.push(...aliasSlugs(canonicalCardSlug(card.slugHint)));
    for (const slug of new Set(slugs)) {
      for (const row of card.currencies) {
        keys.add(`${slug}|${row.currency}`);
      }
    }
  }
  return keys;
}

async function syncSogoCard(card: SogoCardRates, summary: RateSyncSummary): Promise<string> {
  const dbCard = await ensureCardType(card.name, card.slugHint);
  const metaRows: Array<{ country: string; currency: string; minDenom: number; maxDenom: number }> = [];

  for (const row of card.currencies) {
    if (row.physical) {
      await upsertSyncedRate({
        cardTypeId: dbCard.id,
        country: row.country,
        currency: row.currency,
        medium: "PHYSICAL",
        minDenom: row.minDenom,
        maxDenom: row.maxDenom,
        nairaPerUnit: row.physical.nairaPerUnit,
        storedQuotes: row.physical.storedQuotes,
        speed: SOGO_RATE_SPEED,
        summary,
      });
    }
    if (row.ecode) {
      await upsertSyncedRate({
        cardTypeId: dbCard.id,
        country: row.country,
        currency: row.currency,
        medium: "ECODE",
        minDenom: row.minDenom,
        maxDenom: row.maxDenom,
        nairaPerUnit: row.ecode.nairaPerUnit,
        storedQuotes: row.ecode.storedQuotes,
        speed: SOGO_RATE_SPEED,
        summary,
      });
    }
    metaRows.push({
      country: row.country,
      currency: row.currency,
      minDenom: row.minDenom,
      maxDenom: row.maxDenom,
    });
  }

  await persistCurrencyMeta(dbCard.id, metaRows);

  const currencies = [...new Set(card.currencies.map((row) => row.currency))];
  if (currencies.length) {
    await prisma.rate.updateMany({
      where: {
        cardTypeId: dbCard.id,
        currency: { in: currencies },
        speed: { in: ["NOONES", PARTNER_RATE_SPEED] },
      },
      data: { active: false },
    });
  }

  const visible = await refreshCardCatalogVisibility(dbCard.id);
  if (visible) summary.published++;
  else summary.drafted++;
  return dbCard.id;
}

async function syncPartnerRate(rate: PartnerLastRate, covered: Set<string>, summary: RateSyncSummary): Promise<void> {
  const slug = canonicalCardSlug(rate.cardName);
  for (const alias of aliasSlugs(slug)) {
    if (covered.has(`${alias}|${rate.currency}`)) {
      summary.skipped++;
      return;
    }
  }

  const dbCard = await ensureCardType(rate.cardName);
  const alreadySogo = await prisma.rate.count({
    where: {
      cardTypeId: dbCard.id,
      currency: rate.currency,
      speed: SOGO_RATE_SPEED,
      active: true,
    },
  });
  if (alreadySogo > 0) {
    summary.skipped++;
    return;
  }

  for (const medium of ["PHYSICAL", "ECODE"] as CardMedium[]) {
    await upsertSyncedRate({
      cardTypeId: dbCard.id,
      country: rate.country,
      currency: rate.currency,
      medium,
      minDenom: rate.minDenom,
      maxDenom: rate.maxDenom,
      nairaPerUnit: rate.nairaPerUnit,
      storedQuotes: rate.storedQuotes,
      speed: PARTNER_RATE_SPEED,
      summary,
    });
  }

  await persistCurrencyMeta(dbCard.id, [
    { country: rate.country, currency: rate.currency, minDenom: rate.minDenom, maxDenom: rate.maxDenom },
  ]);
  const visible = await refreshCardCatalogVisibility(dbCard.id);
  if (visible) summary.published++;
  else summary.drafted++;
}

export interface CatalogRateSyncOptions {
  force?: boolean;
  cardTypeId?: string;
}

/**
 * Primary catalog rate sync: Sogo public rates, then last-traded rates from
 * contacted NoOnes partners for anything Sogo does not list.
 */
export async function syncCatalogRatesFromSogo(options?: CatalogRateSyncOptions): Promise<RateSyncSummary> {
  const summary = emptySummary();
  if (isNoOnesSyncActive()) setNoOnesSyncPhase("discovering");

  let sogoCards: SogoCardRates[] = [];
  try {
    sogoCards = await fetchSogoGiftCardRates();
  } catch (err) {
    summary.errors.push(`Sogo rates: ${(err as Error).message}`);
    if (isNoOnesSyncActive()) addNoOnesSyncErrors(summary.errors);
    return summary;
  }

  let partnerRates: PartnerLastRate[] = [];
  try {
    partnerRates = await loadPartnerLastTradedRates();
  } catch (err) {
    summary.errors.push(`Partner fallback: ${(err as Error).message}`);
  }

  const covered = sogoCoveredKeys(sogoCards);
  const targetId = options?.cardTypeId;

  if (targetId) {
    const target = await prisma.cardType.findUnique({ where: { id: targetId } });
    if (!target) return summary;
    const targetSlugs = new Set(aliasSlugs(canonicalCardSlug(target.name)));
    sogoCards = sogoCards.filter((card) => {
      const slugs = [canonicalCardSlug(card.name), ...(card.slugHint ? [canonicalCardSlug(card.slugHint)] : [])];
      return slugs.some((slug) => targetSlugs.has(slug) || aliasSlugs(slug).some((a) => targetSlugs.has(a)));
    });
    partnerRates = partnerRates.filter((rate) => targetSlugs.has(canonicalCardSlug(rate.cardName)));
  }

  const total = sogoCards.length + partnerRates.length;
  summary.cardTypes = sogoCards.length;
  if (isNoOnesSyncActive()) {
    setNoOnesSyncTotalCards(Math.max(total, 1));
    setNoOnesSyncPhase("syncing");
  }

  let processed = 0;
  for (const card of sogoCards) {
    processed++;
    if (isNoOnesSyncActive()) setNoOnesSyncCurrentCard({ id: card.slugHint || card.name, name: card.name }, processed);
    try {
      await syncSogoCard(card, summary);
    } catch (err) {
      summary.errors.push(`${card.name}: ${(err as Error).message}`);
    }
    if (isNoOnesSyncActive()) mergeNoOnesSyncSummary(summary);
  }

  for (const rate of partnerRates) {
    processed++;
    if (isNoOnesSyncActive()) {
      setNoOnesSyncCurrentCard({ id: canonicalCardSlug(rate.cardName), name: rate.cardName }, processed);
    }
    try {
      await syncPartnerRate(rate, covered, summary);
    } catch (err) {
      summary.errors.push(`${rate.cardName} ${rate.currency}: ${(err as Error).message}`);
    }
    if (isNoOnesSyncActive()) mergeNoOnesSyncSummary(summary);
  }

  await ensureCardSeoLandingPagesPublished();
  return summary;
}

/** @deprecated Use syncCatalogRatesFromSogo — kept so existing admin/CLI callers keep working. */
export async function syncRatesFromSogo(options?: CatalogRateSyncOptions): Promise<RateSyncSummary> {
  return syncCatalogRatesFromSogo(options);
}
