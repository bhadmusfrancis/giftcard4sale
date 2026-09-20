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

/**
 * How far a SafeTheTrade rate may sit above Sogo's for the same card.
 *
 * SafeTheTrade outranks Sogo, but Sogo is the price a card actually resells at,
 * and SafeTheTrade's thin order book routinely prices well above it. Without a
 * ceiling we would commit to payouts we cannot recover.
 */
const MAX_PREMIUM_OVER_SOGO = Math.max(0, env.rateSync.sttMaxPremiumPercent) / 100;

/**
 * Sellers a marketplace tier needs before it is quoted without a Sogo rate to
 * bound it, and before a brand missing from the catalog is added from it. The
 * admin-set threshold wins; the env value is only the pre-config fallback.
 */
const FALLBACK_MIN_OFFER_OWNERS = Math.max(1, env.rateSync.sttMinOfferOwners);

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
  "footlocker-sports": ["foot-locker", "footlocker"],
  macys: ["macy-s", "macys"],
  delta: ["delta-air-lines", "delta-air-line"],
  "delta-air-lines": ["delta", "delta-air-line"],
  "nintendo-e-shop": ["nintendo-eshop", "nintendo-eshop-card"],
  "nintendo-eshop": ["nintendo-e-shop", "nintendo-eshop-card"],
  curry: ["currys", "currys-pc-world"],
  currys: ["curry", "currys-pc-world"],
  "currys-pc-world": ["curry", "currys"],
  kohls: ["kohls-store"],
  "kohls-store": ["kohls"],
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
  /** False keeps the row current without quoting it (see `syncSogoCard`). */
  activate?: boolean;
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
  const activate = params.activate !== false;

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
    active: activate,
  };

  const existing = siblings.find((r) => r.speed === speed);
  if (existing) {
    await prisma.rate.update({ where: { id: existing.id }, data });
    summary.updated++;
  } else {
    await prisma.rate.create({ data: { cardTypeId, country, medium, ...data } });
    summary.created++;
  }

  if (!activate) return true;

  const supersede = weakerRateSources(speed);
  const stale = siblings.filter((r) => r.speed && supersede.includes(r.speed)).map((r) => r.id);
  if (stale.length) {
    await prisma.rate.updateMany({ where: { id: { in: stale } }, data: { active: false } });
  }
  return true;
}

/**
 * Retire weaker-source rows for a card + currency + medium once a stronger
 * source has written its own. Sources label the same currency with different
 * country names (EUR as "Euro" or "Germany", say), so matching on currency
 * rather than country is what keeps a card from listing the same tier twice.
 */
async function retireWeakerRates(
  cardTypeId: string,
  currency: string,
  medium: CardMedium,
  speed: string
): Promise<void> {
  const weaker = weakerRateSources(speed);
  if (!weaker.length) return;
  await prisma.rate.updateMany({
    where: { cardTypeId, currency, medium, active: true, speed: { in: weaker } },
    data: { active: false },
  });
}

/**
 * Retire the SafeTheTrade row for a tier the live book no longer backs, so a
 * rate an earlier, thicker book wrote cannot keep quoting after the offers
 * behind it thinned below the seller threshold. A tier absent from the feed
 * entirely keeps its last known rate.
 */
async function retireStalePrimaryRate(
  cardTypeId: string,
  currency: string,
  medium: CardMedium
): Promise<boolean> {
  const retired = await prisma.rate.updateMany({
    where: { cardTypeId, currency, medium, speed: STT_RATE_SPEED, active: true },
    data: { active: false },
  });
  return retired.count > 0;
}

/** Latest Sogo rate per medium, keyed by `cardTypeId|currency`. */
type SogoReference = Map<string, Map<CardMedium, number>>;

/**
 * Sogo's rates for the whole catalog: the resale values that bound SafeTheTrade
 * from both sides. Retired rows count — Sogo keeps refreshing them even where
 * SafeTheTrade quotes, precisely so this reference stays current.
 *
 * Loaded once per run because SafeTheTrade now prices hundreds of tiers, and a
 * lookup per tier was the bulk of a sync's database round trips.
 */
async function loadSogoReference(): Promise<SogoReference> {
  const rows = await prisma.rate.findMany({
    where: { speed: SOGO_RATE_SPEED },
    select: { cardTypeId: true, currency: true, medium: true, nairaPerUnit: true },
    orderBy: { updatedAt: "desc" },
  });

  const reference: SogoReference = new Map();
  for (const row of rows) {
    const value = Number(row.nairaPerUnit);
    if (!(value > 0)) continue;
    const key = `${row.cardTypeId}|${row.currency}`;
    const byMedium = reference.get(key) ?? new Map<CardMedium, number>();
    if (!byMedium.has(row.medium)) byMedium.set(row.medium, value);
    reference.set(key, byMedium);
  }
  return reference;
}

/** Scale a rate and its receipt variants by the same factor. */
function scaleQuotes(quotes: StoredQuotes, factor: number): StoredQuotes {
  if (factor >= 1) return quotes;
  const scaled: StoredQuotes = {};
  if (quotes.NONE != null) scaled.NONE = quotes.NONE * factor;
  if (quotes.CASH != null) scaled.CASH = quotes.CASH * factor;
  if (quotes.DEBIT != null) scaled.DEBIT = quotes.DEBIT * factor;
  return scaled;
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

/** Enough independent sellers to trust a marketplace median on its own. */
function hasEnoughOffers(rate: SyncedCardRate, minOfferOwners: number): boolean {
  return (rate.ownerCount ?? rate.offerCount ?? Infinity) >= minOfferOwners;
}

/**
 * Add a card type for a brand no other source lists.
 *
 * Covering brands Sogo never publishes is the point of the marketplace feed,
 * but such a brand arrives with no resale rate to bound it, so only specific,
 * well-listed brands qualify.
 */
async function createBrandFromMarketplace(rate: SyncedCardRate, minOfferOwners: number) {
  if (!rate.catalogCandidate || !hasEnoughOffers(rate, minOfferOwners)) return null;
  return ensureCardType(rate.cardName, rate.slugHint);
}

/**
 * SafeTheTrade rate for one card + currency.
 *
 * SafeTheTrade wins wherever it lists the card: its median quotes even at or
 * below Sogo's rate. Sogo's rate only bounds the upside — above
 * `MAX_PREMIUM_OVER_SOGO` the SafeTheTrade rate is capped — and fills the
 * cards and currencies SafeTheTrade does not price.
 *
 * A tier is quoted only once enough distinct sellers agree on the price —
 * with or without a Sogo reference. A book that thins below the threshold
 * has its stored row retired rather than left quoting; where Sogo lists the
 * same tier its row becomes the active rate instead.
 */
async function syncPrimaryRate(
  rate: SyncedCardRate,
  sogoReference: SogoReference,
  covered: Set<string>,
  touchedCards: Set<string>,
  capped: { count: number },
  summary: RateSyncSummary,
  minOfferOwners: number
): Promise<void> {
  const dbCard =
    (await findCardByName(rate.cardName, rate.slugHint)) ??
    (await createBrandFromMarketplace(rate, minOfferOwners));
  if (!dbCard) {
    summary.skipped++;
    return;
  }

  const reference = sogoReference.get(`${dbCard.id}|${rate.currency}`) ?? new Map<CardMedium, number>();

  let wrote = false;
  let retired = false;
  for (const medium of ["PHYSICAL", "ECODE"] as CardMedium[]) {
    const other: CardMedium = medium === "PHYSICAL" ? "ECODE" : "PHYSICAL";
    const sogoRate = reference.get(medium) ?? reference.get(other);

    if (!hasEnoughOffers(rate, minOfferOwners)) {
      retired = (await retireStalePrimaryRate(dbCard.id, rate.currency, medium)) || retired;
      summary.skipped++;
      continue;
    }

    const ceiling = sogoRate ? sogoRate * (1 + MAX_PREMIUM_OVER_SOGO) : Infinity;
    const nairaPerUnit = Math.min(rate.nairaPerUnit, ceiling);
    if (nairaPerUnit < rate.nairaPerUnit) capped.count++;

    const written = await upsertSyncedRate({
      cardTypeId: dbCard.id,
      country: rate.country,
      currency: rate.currency,
      medium,
      minDenom: rate.minDenom,
      maxDenom: rate.maxDenom,
      nairaPerUnit,
      storedQuotes: scaleQuotes(rate.storedQuotes, nairaPerUnit / rate.nairaPerUnit),
      speed: STT_RATE_SPEED,
      summary,
    });
    if (!written) continue;

    covered.add(`${dbCard.id}|${rate.currency}|${medium}`);
    await retireWeakerRates(dbCard.id, rate.currency, medium, STT_RATE_SPEED);
    wrote = true;
  }
  if (!wrote) {
    if (retired) touchedCards.add(dbCard.id);
    return;
  }

  touchedCards.add(dbCard.id);
  await persistCurrencyMeta(dbCard.id, [
    { country: rate.country, currency: rate.currency, minDenom: rate.minDenom, maxDenom: rate.maxDenom },
  ]);
}

/**
 * Sogo rates for a card.
 *
 * Tiers SafeTheTrade already priced are still written, but retired rather than
 * quotable: they are the resale-value reference that bounds SafeTheTrade, and a
 * reference nothing refreshes would drift further off every cycle.
 */
async function syncSogoCard(
  card: SogoCardRates,
  covered: Set<string>,
  touchedCards: Set<string>,
  summary: RateSyncSummary
): Promise<void> {
  const dbCard = await ensureCardType(card.name, card.slugHint);
  const metaRows: Array<{ country: string; currency: string; minDenom: number; maxDenom: number }> = [];

  for (const row of card.currencies) {
    const physicalActive = !covered.has(`${dbCard.id}|${row.currency}|PHYSICAL`);
    const ecodeActive = !covered.has(`${dbCard.id}|${row.currency}|ECODE`);
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
        activate: physicalActive,
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
        activate: ecodeActive,
      });
    }
    // SafeTheTrade already recorded denominations for the tiers it priced.
    if (!physicalActive && !ecodeActive) continue;
    metaRows.push({
      country: row.country,
      currency: row.currency,
      minDenom: row.minDenom,
      maxDenom: row.maxDenom,
    });
  }

  touchedCards.add(dbCard.id);
  await persistCurrencyMeta(dbCard.id, metaRows);
}

/**
 * Publish or draft each card a run touched, once its rows are all written.
 * Both sources write several tiers per card, so this cannot run per rate row.
 */
async function refreshTouchedCards(touchedCards: Set<string>, summary: RateSyncSummary): Promise<void> {
  for (const cardTypeId of touchedCards) {
    const visible = await refreshCardCatalogVisibility(cardTypeId);
    if (visible) summary.published++;
    else summary.drafted++;
  }
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
  let minOfferOwners = FALLBACK_MIN_OFFER_OWNERS;
  if (env.safeTheTrade.enabled) {
    try {
      const config = await getRateConfig();
      minOfferOwners = Math.max(1, config.sttMinOfferOwners);
      primaryRates = await fetchSafeTheTradeRates(config.rates.ngnPerUsdt, minOfferOwners);
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

  /** `cardTypeId|currency|medium` tiers SafeTheTrade priced, so Sogo does not quote them. */
  const covered = new Set<string>();
  const touchedCards = new Set<string>();
  const capped = { count: 0 };
  const sogoReference = primaryRates.length ? await loadSogoReference() : new Map();
  let processed = 0;

  for (const rate of primaryRates) {
    processed++;
    if (isRateSyncActive()) {
      setRateSyncCurrentCard({ id: canonicalCardSlug(rate.cardName), name: rate.cardName }, processed);
    }
    try {
      await syncPrimaryRate(rate, sogoReference, covered, touchedCards, capped, summary, minOfferOwners);
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

  await refreshTouchedCards(touchedCards, summary);

  summary.cardTypes = touchedCards.size;
  if (capped.count) {
    console.log(
      `Capped ${capped.count} SafeTheTrade rate(s) at Sogo + ${env.rateSync.sttMaxPremiumPercent}%.`
    );
  }
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
