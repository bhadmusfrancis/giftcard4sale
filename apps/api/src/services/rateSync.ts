import { CardMedium, Prisma } from "@prisma/client";
import { canonicalCardSlug, sellSlug, StoredQuotes } from "@gc4s/shared";
import { prisma } from "../prisma";
import { findExistingCardType } from "./cardTypeDedup";
import { ensureCardSeoLandingPagesPublished, refreshCardCatalogVisibility } from "./cardVisibility";
import { persistCardCurrencyMeta } from "./noones/currencyMeta";
import { resolvePaymentMethodSlug } from "./noones/paymentMethods";
import { storedQuotesToJson } from "./noones/storedQuotes";
import { env } from "../env";
import { getRateConfig } from "./rateConfig";
import { isManualRateSpeed, SOGO_RATE_SPEED, STT_RATE_SPEED, weakerRateSources } from "./rateSources";
import { recordRateSyncAttempt, recordRateSyncSuccess } from "./rateSyncState";
import {
  addRateSyncErrors,
  isRateSyncActive,
  mergeRateSyncSummary,
  setRateSyncCurrentCard,
  setRateSyncPhase,
  setRateSyncTotalCards,
} from "./rateSyncStatus";
import { emptyRateSyncSummary, type RateSyncSummary, type SyncedCardRate } from "./rateTypes";
import { fetchSafeTheTradeRates } from "./safethetrade";
import { fetchSogoGiftCardRates, type SogoCardRates } from "./sogo/scraper";

/** Rows a sync writes are always quotable, so they clear the display threshold. */
const SYNCED_OFFER_COUNT = 999;

const NAME_ALIASES: Record<string, string[]> = {
  "apple-itunes": ["itunes", "apple", "apple-us-only", "apple-gift-card-us-only"],
  itunes: ["apple-itunes", "apple", "apple-us-only"],
  "apple-us-only": ["apple-itunes", "itunes"],
  apple: ["apple-itunes", "itunes"],
  eneba: ["eneba-gift-card"],
  "eneba-gift-card": ["eneba"],
  paysafecard: ["paysafe", "paysafe-card"],
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
      offerCount: SYNCED_OFFER_COUNT,
    },
  });
}

/**
 * Write one rate row and retire only the weaker-source rows it actually
 * replaces. Returns false when nothing was written, so callers never retire a
 * row without a live replacement in hand.
 */
async function upsertSyncedRate(params: {
  cardTypeId: string;
  country: string;
  currency: string;
  medium: CardMedium;
  minDenom: number;
  maxDenom: number;
  nairaPerUnit: number;
  storedQuotes: StoredQuotes;
  speed: string;
  summary: RateSyncSummary;
}): Promise<boolean> {
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

  if (!(nairaPerUnit > 0)) {
    summary.skipped++;
    return false;
  }

  // One read covers both the manual-rate guard and the existing-row lookup.
  const siblings = await prisma.rate.findMany({
    where: { cardTypeId, country, medium },
    select: { id: true, speed: true },
  });

  if (siblings.some((r) => isManualRateSpeed(r.speed))) {
    summary.skipped++;
    return false;
  }

  const data = {
    currency,
    minDenom,
    maxDenom,
    nairaPerUnit: new Prisma.Decimal(nairaPerUnit.toFixed(4)),
    storedQuotes: storedQuotesToJson(storedQuotes),
    countryOfferCount: SYNCED_OFFER_COUNT,
    speed,
    active: true,
  };

  const existing = siblings.find((r) => r.speed === speed);
  if (existing) {
    await prisma.rate.update({ where: { id: existing.id }, data });
    summary.updated++;
  } else {
    await prisma.rate.create({ data: { cardTypeId, country, medium, ...data } });
    summary.created++;
  }

  const supersede = weakerRateSources(speed);
  const stale = siblings.filter((r) => r.speed && supersede.includes(r.speed)).map((r) => r.id);
  if (stale.length) {
    await prisma.rate.updateMany({ where: { id: { in: stale } }, data: { active: false } });
  }
  return true;
}

/**
 * Retire weaker-source rows for a card + currency once a stronger source has
 * written its own. Sources label the same currency with different country names
 * (for example EUR as "Euro" or "Germany"), so matching on currency alone is
 * what keeps a card from listing the same currency twice.
 */
async function retireWeakerRatesForCurrency(
  cardTypeId: string,
  currency: string,
  speed: string
): Promise<void> {
  const weaker = weakerRateSources(speed);
  if (!weaker.length) return;
  await prisma.rate.updateMany({
    where: { cardTypeId, currency, active: true, speed: { in: weaker } },
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
      offerCount: SYNCED_OFFER_COUNT,
      ranges: [{ min: row.minDenom, max: row.maxDenom }],
    });
  }
}

/**
 * SafeTheTrade rate for one card + currency.
 *
 * Only touches brands already in the catalog: this order book's long tail is
 * not worth creating card types from, and Sogo defines which brands we list.
 */
async function syncPrimaryRate(
  rate: SyncedCardRate,
  covered: Set<string>,
  touchedCards: Set<string>,
  summary: RateSyncSummary
): Promise<void> {
  const dbCard = await findCardByName(rate.cardName, rate.slugHint);
  if (!dbCard) {
    summary.skipped++;
    return;
  }

  let wrote = false;
  for (const medium of ["PHYSICAL", "ECODE"] as CardMedium[]) {
    const written = await upsertSyncedRate({
      cardTypeId: dbCard.id,
      country: rate.country,
      currency: rate.currency,
      medium,
      minDenom: rate.minDenom,
      maxDenom: rate.maxDenom,
      nairaPerUnit: rate.nairaPerUnit,
      storedQuotes: rate.storedQuotes,
      speed: STT_RATE_SPEED,
      summary,
    });
    wrote = wrote || written;
  }
  if (!wrote) return;

  covered.add(`${dbCard.id}|${rate.currency}`);
  touchedCards.add(dbCard.id);
  await retireWeakerRatesForCurrency(dbCard.id, rate.currency, STT_RATE_SPEED);

  await persistCurrencyMeta(dbCard.id, [
    { country: rate.country, currency: rate.currency, minDenom: rate.minDenom, maxDenom: rate.maxDenom },
  ]);
  const visible = await refreshCardCatalogVisibility(dbCard.id);
  if (visible) summary.published++;
  else summary.drafted++;
}

/** Sogo rates for every currency SafeTheTrade did not price this run. */
async function syncSogoCard(
  card: SogoCardRates,
  covered: Set<string>,
  touchedCards: Set<string>,
  summary: RateSyncSummary
): Promise<void> {
  const dbCard = await ensureCardType(card.name, card.slugHint);
  const metaRows: Array<{ country: string; currency: string; minDenom: number; maxDenom: number }> = [];

  for (const row of card.currencies) {
    if (covered.has(`${dbCard.id}|${row.currency}`)) {
      summary.skipped++;
      continue;
    }
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

  touchedCards.add(dbCard.id);
  await persistCurrencyMeta(dbCard.id, metaRows);

  const visible = await refreshCardCatalogVisibility(dbCard.id);
  if (visible) summary.published++;
  else summary.drafted++;
}

export interface CatalogRateSyncOptions {
  force?: boolean;
  cardTypeId?: string;
}

/**
 * Catalog rate sync: SafeTheTrade first, then Sogo for every card + currency
 * SafeTheTrade did not price.
 *
 * Every source failure is non-destructive. A source that returns nothing simply
 * leaves the rows it would have refreshed untouched, so the catalog keeps
 * serving the last rates it had rather than emptying out.
 */
export async function syncCatalogRates(options?: CatalogRateSyncOptions): Promise<RateSyncSummary> {
  const summary = emptyRateSyncSummary();
  if (isRateSyncActive()) setRateSyncPhase("discovering");
  if (!options?.cardTypeId) await recordRateSyncAttempt();

  let primaryRates: SyncedCardRate[] = [];
  if (env.safeTheTrade.enabled) {
    try {
      const config = await getRateConfig();
      primaryRates = await fetchSafeTheTradeRates(config.rates.ngnPerUsdt);
    } catch (err) {
      summary.errors.push(`SafeTheTrade: ${(err as Error).message}`);
    }
  }

  let sogoCards: SogoCardRates[] = [];
  try {
    sogoCards = await fetchSogoGiftCardRates();
  } catch (err) {
    summary.errors.push(`Sogo rates: ${(err as Error).message}`);
  }

  if (!primaryRates.length && !sogoCards.length) {
    summary.errors.push("No rate source returned data; keeping the rates already stored.");
    if (isRateSyncActive()) addRateSyncErrors(summary.errors);
    return summary;
  }

  const targetId = options?.cardTypeId;
  if (targetId) {
    const target = await prisma.cardType.findUnique({ where: { id: targetId } });
    if (!target) return summary;
    const targetSlugs = new Set(aliasSlugs(canonicalCardSlug(target.name)));
    primaryRates = primaryRates.filter((rate) =>
      targetSlugs.has(canonicalCardSlug(rate.slugHint || rate.cardName))
    );
    sogoCards = sogoCards.filter((card) => {
      const slugs = [canonicalCardSlug(card.name), ...(card.slugHint ? [canonicalCardSlug(card.slugHint)] : [])];
      return slugs.some((slug) => targetSlugs.has(slug) || aliasSlugs(slug).some((a) => targetSlugs.has(a)));
    });
  }

  const total = primaryRates.length + sogoCards.length;
  if (isRateSyncActive()) {
    setRateSyncTotalCards(Math.max(total, 1));
    setRateSyncPhase("syncing");
  }

  /** `cardTypeId|currency` pairs SafeTheTrade priced, so Sogo leaves them alone. */
  const covered = new Set<string>();
  const touchedCards = new Set<string>();
  let processed = 0;

  for (const rate of primaryRates) {
    processed++;
    if (isRateSyncActive()) {
      setRateSyncCurrentCard({ id: canonicalCardSlug(rate.cardName), name: rate.cardName }, processed);
    }
    try {
      await syncPrimaryRate(rate, covered, touchedCards, summary);
    } catch (err) {
      summary.errors.push(`${rate.cardName} ${rate.currency}: ${(err as Error).message}`);
    }
    if (isRateSyncActive()) mergeRateSyncSummary(summary);
  }

  for (const card of sogoCards) {
    processed++;
    if (isRateSyncActive()) setRateSyncCurrentCard({ id: card.slugHint || card.name, name: card.name }, processed);
    try {
      await syncSogoCard(card, covered, touchedCards, summary);
    } catch (err) {
      summary.errors.push(`${card.name}: ${(err as Error).message}`);
    }
    if (isRateSyncActive()) mergeRateSyncSummary(summary);
  }

  summary.cardTypes = touchedCards.size;
  await ensureCardSeoLandingPagesPublished();

  // A full run that wrote rows is what clears the public "rate may be outdated"
  // notice; single-card syncs say nothing about the rest of the catalog.
  if (!targetId && summary.created + summary.updated > 0) {
    const sources = [
      ...(primaryRates.length ? [STT_RATE_SPEED] : []),
      ...(sogoCards.length ? [SOGO_RATE_SPEED] : []),
    ];
    await recordRateSyncSuccess(sources);
  }

  return summary;
}
