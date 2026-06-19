import { CardMedium, Prisma } from "@prisma/client";
import { canonicalCardSlug, sellSlug } from "@gc4s/shared";
import { prisma } from "../../prisma";
import { findExistingCardType } from "../cardTypeDedup";
import { applyNoOnesPublishState, isManualRateSpeed, MANUAL_RATE_WHERE, refreshCardCatalogVisibility } from "../cardVisibility";
import { getRateConfig, isRateSyncFresh } from "../rateConfig";
import { isNoOnesConfigured, noonesPost } from "./client";
import { resolvePaymentMethodSlug } from "./paymentMethods";
import { buildSyncTargets, paymentMethodToCardName, RateSyncTarget, OTHER_COUNTRY_TIER, isOtherCountryTier, appendDiscoveredCurrencyTargets, expandTargetsFromOfferRanges, ensureTargetsForCurrencyMeta, currencyTierFromCode } from "./rateCatalog";
import { discoverOfferCurrencies, fetchNoOnesCardStats, fetchCurrencyOfferMeta, type CurrencyOfferMeta } from "./offers";
import { fetchStoredQuotesForTarget, storedQuotesToJson } from "./storedQuotes";
import { persistCardCurrencyMeta } from "./currencyMeta";
import { countOtherCountryOffers, hasOtherCountryOffers } from "./otherCountries";
import { fetchAverageOfferForMedium } from "./rates";
import { StoredQuotes } from "@gc4s/shared";
import { isCardPublishable, isCountryTierDisplayable } from "./publishPolicy";
import { resolveCardRegionLock, tierMatchesRegionLock } from "./regionLock";
import {
  addNoOnesSyncErrors,
  isNoOnesSyncActive,
  mergeNoOnesSyncSummary,
  setNoOnesSyncCurrentCard,
  setNoOnesSyncPhase,
  setNoOnesSyncTotalCards,
} from "./syncStatus";
import { getNoOnesSyncLimits, sleep } from "./syncLimits";

export interface RateSyncSummary {
  created: number;
  updated: number;
  skipped: number;
  drafted: number;
  published: number;
  cardTypes: number;
  errors: string[];
}

export interface RateSyncOptions {
  force?: boolean;
  hydrationOnly?: boolean;
  /** When set, only these card types are synced (used by the stale-card scheduler). */
  cardTypeIds?: string[];
}

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
    let tradeVolume = 0;
    let offerCountKnown = false;
    const regionLock = resolveCardRegionLock(slug, name, method.slug);
    const statsCurrency = regionLock?.currencies[0];
    try {
      ({ offerCount, tradeVolume } = await fetchNoOnesCardStats(method.slug, statsCurrency));
      offerCountKnown = true;
    } catch (err) {
      console.warn(`NoOnes offer count for ${method.slug}: ${(err as Error).message}`);
    }

    if (existing) {
      await prisma.cardType.update({
        where: { id: existing.id },
        data: {
          name,
          slug,
          sellSlug: sellSlug(name),
          noonesPaymentMethod: method.slug,
        },
      });
      await applyNoOnesPublishState(existing.id, offerCount, offerCountKnown, tradeVolume);
    } else if (offerCountKnown) {
      const publishable = isCardPublishable(offerCount);
      await prisma.cardType.create({
        data: {
          name,
          slug,
          sellSlug: sellSlug(name),
          noonesPaymentMethod: method.slug,
          offerCount,
          tradeVolume,
          active: publishable,
        },
      });
    } else {
      await prisma.cardType.create({
        data: {
          name,
          slug,
          sellSlug: sellSlug(name),
          noonesPaymentMethod: method.slug,
          offerCount: 0,
          active: false,
        },
      });
    }
    count++;
    await sleep(getNoOnesSyncLimits().staleCheckPauseMs);
  }

  return count;
}

async function upsertRateFromNoOnes(
  cardTypeId: string,
  target: RateSyncTarget,
  nairaPerUnit: number,
  storedQuotes: StoredQuotes,
  countryOfferCount: number,
  minCountryOffers: number
): Promise<"created" | "updated" | "skipped"> {
  const tierWhere = {
    cardTypeId,
    country: target.country,
    medium: target.medium,
    minDenom: target.minDenom,
    maxDenom: target.maxDenom,
  };

  const manualExisting = await prisma.rate.findFirst({
    where: { ...tierWhere, ...MANUAL_RATE_WHERE },
  });
  if (manualExisting) return "skipped";

  const noonesExisting = await prisma.rate.findFirst({
    where: { ...tierWhere, speed: "NOONES" },
  });

  const displayable =
    isCountryTierDisplayable(countryOfferCount, minCountryOffers) &&
    (isOtherCountryTier(target.country) ||
      !(target.minDenom == null && target.maxDenom == null));
  const data = {
    nairaPerUnit: new Prisma.Decimal(nairaPerUnit.toFixed(4)),
    storedQuotes: storedQuotesToJson(storedQuotes),
    currency: target.currency,
    speed: "NOONES",
    countryOfferCount,
    active: displayable,
  };

  if (noonesExisting) {
    await prisma.rate.update({ where: { id: noonesExisting.id }, data });
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

async function deactivateStaleDenomTiers(
  cardTypeId: string,
  metaByCurrency: Map<string, CurrencyOfferMeta>
): Promise<void> {
  const noonesRates = await prisma.rate.findMany({
    where: { cardTypeId, speed: "NOONES" },
  });

  for (const rate of noonesRates) {
    if (isOtherCountryTier(rate.country)) continue;
    const meta = metaByCurrency.get(rate.currency);
    if (!meta?.ranges.length) continue;
    const matches = meta.ranges.some((r) => r.min === rate.minDenom && r.max === rate.maxDenom);
    if (!matches) {
      await prisma.rate.update({ where: { id: rate.id }, data: { active: false } });
    }
  }
}

async function stashCountryTier(
  cardTypeId: string,
  target: RateSyncTarget,
  countryOfferCount: number,
  nairaPerUnit?: number,
  storedQuotes?: StoredQuotes
): Promise<void> {
  const existing = await prisma.rate.findFirst({
    where: {
      cardTypeId,
      country: target.country,
      medium: target.medium,
      minDenom: target.minDenom,
      maxDenom: target.maxDenom,
      speed: "NOONES",
    },
  });

  const data: Prisma.RateUpdateInput = {
    countryOfferCount,
    active: false,
  };
  if (nairaPerUnit && nairaPerUnit > 0) {
    data.nairaPerUnit = new Prisma.Decimal(nairaPerUnit.toFixed(4));
  }
  if (storedQuotes) {
    data.storedQuotes = storedQuotesToJson(storedQuotes);
  }

  if (existing) {
    await prisma.rate.update({ where: { id: existing.id }, data });
    return;
  }

  if (target.minDenom == null && target.maxDenom == null && !isOtherCountryTier(target.country)) return;

  await prisma.rate.create({
    data: {
      cardTypeId,
      country: target.country,
      minDenom: target.minDenom,
      maxDenom: target.maxDenom,
      medium: target.medium,
      currency: target.currency,
      speed: "NOONES",
      nairaPerUnit: new Prisma.Decimal((nairaPerUnit && nairaPerUnit > 0 ? nairaPerUnit : 0).toFixed(4)),
      storedQuotes: storedQuotes ? storedQuotesToJson(storedQuotes) : undefined,
      countryOfferCount,
      active: false,
    },
  });
}

async function syncCardTypeRates(
  card: { id: string; slug: string; name: string; noonesPaymentMethod: string | null },
  summary: RateSyncSummary,
  options?: RateSyncOptions
): Promise<void> {
  const paymentMethod = resolvePaymentMethodSlug(card.slug, card.name, card.noonesPaymentMethod);
  if (!paymentMethod) {
    summary.skipped++;
    summary.errors.push(`${card.name}: no payment-method mapping`);
    return;
  }

  const regionLock = resolveCardRegionLock(card.slug, card.name, card.noonesPaymentMethod);
  const statsCurrency = regionLock?.currencies[0];

  const { noonesRateRefreshMinutes, minCountryOffersForDisplay } = await getRateConfig();

  const existingNoones = await prisma.rate.findMany({
    where: { cardTypeId: card.id, speed: "NOONES" },
    select: { updatedAt: true, minDenom: true, maxDenom: true, active: true, country: true },
  });
  const currencyMetaRows = await prisma.cardCurrencyMeta.findMany({
    where: { cardTypeId: card.id },
    select: { syncedAt: true },
  });
  const hasOpenEnded = existingNoones.some(
    (r) => r.active && r.minDenom == null && r.maxDenom == null && !isOtherCountryTier(r.country)
  );
  const activeNoones = existingNoones.filter((r) => r.active);
  const metaFresh =
    currencyMetaRows.length > 0 &&
    currencyMetaRows.every((m) => isRateSyncFresh(m.syncedAt, noonesRateRefreshMinutes));
  const cardFullyFresh =
    activeNoones.length > 0 &&
    !hasOpenEnded &&
    metaFresh &&
    activeNoones.every((r) => isRateSyncFresh(r.updatedAt, noonesRateRefreshMinutes));

  if (!options?.force && cardFullyFresh) {
    summary.skipped++;
    return;
  }

  try {
    const { offerCount, tradeVolume } = await fetchNoOnesCardStats(paymentMethod, statsCurrency);
    const { publishable, drafted } = await applyNoOnesPublishState(card.id, offerCount, true, tradeVolume);

    if (drafted && !publishable) {
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
  let targets = buildSyncTargets(existingRates, { ...options, regionLock });

  await prisma.rate.updateMany({
    where: {
      cardTypeId: card.id,
      speed: "NOONES",
      minDenom: null,
      maxDenom: null,
      country: { not: "Other" },
    },
    data: { active: false },
  });

  let discovered: string[] = [];
  if (!regionLock) {
    try {
      discovered = await discoverOfferCurrencies(paymentMethod);
      targets = appendDiscoveredCurrencyTargets(targets, discovered, regionLock);
    } catch (err) {
      summary.errors.push(`${card.name}: currency discovery — ${(err as Error).message}`);
    }
  }
  const currencies = [...new Set([...targets.map((t) => t.currency), ...discovered])];
  const metaByCurrency = new Map<string, CurrencyOfferMeta>();
  const { pauseBetweenTargetsMs } = getNoOnesSyncLimits();
  for (const currency of currencies) {
    try {
      metaByCurrency.set(currency, await fetchCurrencyOfferMeta(paymentMethod, currency));
    } catch (err) {
      summary.errors.push(`${card.name}/${currency}: offer meta — ${(err as Error).message}`);
      metaByCurrency.set(currency, { offerCount: 0, ranges: [] });
    }
    await sleep(pauseBetweenTargetsMs);
  }
  targets = ensureTargetsForCurrencyMeta(targets, metaByCurrency);
  targets = expandTargetsFromOfferRanges(targets, metaByCurrency);

  for (const [currency, meta] of metaByCurrency) {
    const country =
      targets.find((t) => t.currency === currency)?.country ?? currencyTierFromCode(currency).country;
    try {
      await persistCardCurrencyMeta(card.id, country, currency, meta);
    } catch (err) {
      summary.errors.push(`${card.name}/${currency}: meta persist — ${(err as Error).message}`);
    }
  }

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

      if (existing && isManualRateSpeed(existing.speed)) {
        summary.skipped++;
        continue;
      }

      const missingBounds = existing?.minDenom == null && existing?.maxDenom == null;
      if (!options?.force && existing && isRateSyncFresh(existing.updatedAt, noonesRateRefreshMinutes) && !missingBounds) {
        summary.skipped++;
        continue;
      }

      const countryOfferCount = metaByCurrency.get(target.currency)?.offerCount ?? 0;

      const { storedQuotes, nairaPerUnit } = await fetchStoredQuotesForTarget({
        paymentMethod,
        cardCurrency: target.currency,
        cardAmount: target.sampleAmount,
        medium: target.medium as CardMedium,
        otherCountriesOnly: isOtherCountryTier(target.country),
      });

      if (!nairaPerUnit || nairaPerUnit <= 0) {
        await stashCountryTier(card.id, target, countryOfferCount, undefined, storedQuotes);
        summary.skipped++;
        continue;
      }

      if (!isCountryTierDisplayable(countryOfferCount, minCountryOffersForDisplay)) {
        await stashCountryTier(card.id, target, countryOfferCount, nairaPerUnit, storedQuotes);
        summary.skipped++;
        continue;
      }

      const result = await upsertRateFromNoOnes(
        card.id,
        target,
        nairaPerUnit,
        storedQuotes,
        countryOfferCount,
        minCountryOffersForDisplay
      );
      if (result === "created") summary.created++;
      else if (result === "updated") summary.updated++;
      else summary.skipped++;

      await sleep(pauseBetweenTargetsMs);
    } catch (err) {
      summary.errors.push(
        `${card.name}/${target.country}/${target.medium}: ${(err as Error).message}`
      );
    }
  }

  // Sync "Other" country tier only when live offers accept non-standard countries.
  if (!regionLock) {
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

        if (!options?.force && existing && isRateSyncFresh(existing.updatedAt, noonesRateRefreshMinutes)) {
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
          if (existing && !isRateSyncFresh(existing.updatedAt, noonesRateRefreshMinutes)) {
            await stashCountryTier(card.id, otherTarget, 0);
          }
          summary.skipped++;
          continue;
        }

        const otherOfferCount = await countOtherCountryOffers(paymentMethod, { medium });
        if (!isCountryTierDisplayable(otherOfferCount, minCountryOffersForDisplay)) {
          await stashCountryTier(card.id, otherTarget, otherOfferCount, nairaPerUnit, storedQuotes);
          summary.skipped++;
          continue;
        }

        const result = await upsertRateFromNoOnes(
          card.id,
          otherTarget,
          nairaPerUnit,
          storedQuotes,
          otherOfferCount,
          minCountryOffersForDisplay
        );
        if (result === "created") summary.created++;
        else if (result === "updated") summary.updated++;
        else summary.skipped++;
        await sleep(pauseBetweenTargetsMs);
      }
    } else {
      const staleOther = await prisma.rate.findMany({
        where: { cardTypeId: card.id, country: "Other", speed: "NOONES" },
      });
      for (const row of staleOther) {
        if (!isRateSyncFresh(row.updatedAt, noonesRateRefreshMinutes)) {
          await prisma.rate.update({ where: { id: row.id }, data: { active: false } });
        }
      }
    }
  } catch (err) {
    summary.errors.push(`${card.name}/Other: ${(err as Error).message}`);
  }
  }

  await deactivateStaleDenomTiers(card.id, metaByCurrency);

  await prisma.rate.updateMany({
    where: {
      cardTypeId: card.id,
      speed: "NOONES",
      minDenom: null,
      maxDenom: null,
      country: { not: "Other" },
    },
    data: { active: false },
  });

  if (regionLock) {
    const outOfRegion = await prisma.rate.findMany({
      where: { cardTypeId: card.id, speed: "NOONES", active: true },
    });
    for (const rate of outOfRegion) {
      if (!tierMatchesRegionLock(rate, regionLock)) {
        await prisma.rate.update({ where: { id: rate.id }, data: { active: false } });
      }
    }
  }

  const visible = await refreshCardCatalogVisibility(card.id);
  if (!visible) summary.drafted++;
}

/** Re-apply active flags on stored NoOnes tiers after admin changes the minimum offer threshold. */
export async function reapplyCountryTierVisibility(minOffers: number): Promise<number> {
  const rates = await prisma.rate.findMany({
    where: { speed: "NOONES", countryOfferCount: { not: null } },
    include: { cardType: { select: { slug: true, name: true, noonesPaymentMethod: true } } },
  });

  let updated = 0;
  const cardIds = new Set<string>();

  for (const rate of rates) {
    const regionLock = resolveCardRegionLock(
      rate.cardType.slug,
      rate.cardType.name,
      rate.cardType.noonesPaymentMethod
    );
    let shouldBeActive =
      isCountryTierDisplayable(rate.countryOfferCount ?? 0, minOffers) &&
      (isOtherCountryTier(rate.country) ||
        !(rate.minDenom == null && rate.maxDenom == null));
    if (shouldBeActive && regionLock && !tierMatchesRegionLock(rate, regionLock)) {
      shouldBeActive = false;
    }

    if (rate.active !== shouldBeActive) {
      await prisma.rate.update({ where: { id: rate.id }, data: { active: shouldBeActive } });
      updated++;
    }
    cardIds.add(rate.cardTypeId);
  }

  for (const cardTypeId of cardIds) {
    await refreshCardCatalogVisibility(cardTypeId);
  }

  return updated;
}

async function syncCardsInBatches(
  cardTypes: { id: string; slug: string; name: string; noonesPaymentMethod: string | null }[],
  summary: RateSyncSummary,
  options?: RateSyncOptions
): Promise<void> {
  const { cardsPerBatch, pauseBetweenBatchesMs, pauseBetweenCardsMs } = getNoOnesSyncLimits();

  for (let batchStart = 0; batchStart < cardTypes.length; batchStart += cardsPerBatch) {
    const batch = cardTypes.slice(batchStart, batchStart + cardsPerBatch);

    for (let i = 0; i < batch.length; i++) {
      const card = batch[i];
      const processed = batchStart + i + 1;
      if (isNoOnesSyncActive()) {
        setNoOnesSyncCurrentCard({ id: card.id, name: card.name }, processed);
      }
      const errorsBefore = summary.errors.length;
      await syncCardTypeRates(card, summary, options);
      if (isNoOnesSyncActive()) {
        mergeNoOnesSyncSummary(summary);
        const newErrors = summary.errors.slice(errorsBefore);
        if (newErrors.length) addNoOnesSyncErrors(newErrors);
      }
      if (i < batch.length - 1) await sleep(pauseBetweenCardsMs);
    }

    if (batchStart + cardsPerBatch < cardTypes.length) {
      await sleep(pauseBetweenBatchesMs);
    }
  }
}

/**
 * Generate all rates from NoOnes: existing rows, missing cards, PHYSICAL + ECODE tiers.
 */
export async function syncRatesFromNoOnes(options?: RateSyncOptions): Promise<RateSyncSummary> {
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

  if (isNoOnesSyncActive()) setNoOnesSyncPhase("discovering");

  try {
    await ensureCardTypesFromNoOnes();
  } catch (err) {
    summary.errors.push(`Card type discovery: ${(err as Error).message}`);
    if (isNoOnesSyncActive()) addNoOnesSyncErrors([summary.errors[summary.errors.length - 1]]);
  }

  let cardTypes = await prisma.cardType.findMany({
    where: { noonesPaymentMethod: { not: null } },
    orderBy: { name: "asc" },
  });

  if (options?.cardTypeIds?.length) {
    const allowed = new Set(options.cardTypeIds);
    cardTypes = cardTypes.filter((c) => allowed.has(c.id));
  }

  summary.cardTypes = cardTypes.length;

  if (isNoOnesSyncActive()) {
    setNoOnesSyncTotalCards(cardTypes.length);
    setNoOnesSyncPhase("syncing");
  }

  await syncCardsInBatches(cardTypes, summary, options);

  return summary;
}

const cardSyncInFlight = new Map<string, Promise<RateSyncSummary>>();

/** Pull live NoOnes rates for one card into the database (server-side only). */
export async function syncCardRatesFromNoOnes(
  cardTypeId: string,
  options?: { force?: boolean }
): Promise<RateSyncSummary> {
  const inFlight = cardSyncInFlight.get(cardTypeId);
  if (inFlight) return inFlight;

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

  const card = await prisma.cardType.findUnique({ where: { id: cardTypeId } });
  if (!card) return summary;

  summary.cardTypes = 1;

  const promise = (async () => {
    if (isNoOnesSyncActive()) {
      setNoOnesSyncPhase("syncing");
      setNoOnesSyncCurrentCard({ id: card.id, name: card.name }, 1);
    }
    const errorsBefore = summary.errors.length;
    await syncCardTypeRates(card, summary, { hydrationOnly: true, force: options?.force });
    if (isNoOnesSyncActive()) {
      mergeNoOnesSyncSummary(summary);
      const newErrors = summary.errors.slice(errorsBefore);
      if (newErrors.length) addNoOnesSyncErrors(newErrors);
    }
    return summary;
  })().finally(() => cardSyncInFlight.delete(cardTypeId));

  cardSyncInFlight.set(cardTypeId, promise);
  return promise;
}

/** @deprecated Use syncCardRatesFromNoOnes */
export async function hydrateCardRatesFromNoOnes(cardTypeId: string): Promise<number> {
  const summary = await syncCardRatesFromNoOnes(cardTypeId);
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
