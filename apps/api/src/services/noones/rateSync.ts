import { CardMedium, Prisma } from "@prisma/client";
import { canonicalCardSlug, sellSlug } from "@gc4s/shared";
import { prisma } from "../../prisma";
import { findExistingCardType } from "../cardTypeDedup";
import { applyNoOnesPublishState, ensureCardSeoLandingPagesPublished, isManualRateSpeed, MANUAL_RATE_WHERE, refreshCardCatalogVisibility } from "../cardVisibility";
import { getRateConfig, getCardRateStalenessInfo, isRateSyncFresh, cardTypePopularityOrder, filterStaleCardTypes } from "../rateConfig";
import { isNoOnesConfigured, noonesPost } from "./client";
import { resolvePaymentMethodSlug } from "./paymentMethods";
import { buildSyncTargets, paymentMethodToCardName, RateSyncTarget, OTHER_COUNTRY_TIER, GENERIC_EURO_TIER, isOtherCountryTier, isEuroTier, isOpenEndedCountryTier, appendDiscoveredCurrencyTargets, expandTargetsFromOfferRanges, ensureTargetsForCurrencyMeta, currencyTierFromCode } from "./rateCatalog";
import { discoverOfferCurrencies, fetchNoOnesCardStats, fetchCurrencyOfferMeta, type CurrencyOfferMeta } from "./offers";
import { fetchStoredQuotesForTarget, storedQuotesToJson } from "./storedQuotes";
import { persistCardCurrencyMeta } from "./currencyMeta";
import { countOtherCountryOffers, hasOtherCountryOffers } from "./otherCountries";
import { countGenericEuroOffers, fetchGenericEuroOfferMeta } from "./genericEuro";
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
import { isExcludedNoOnesPaymentMethod, noonesLinkedCardWhere } from "./exclusions";

export interface RateSyncSummary {
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
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
  return list
    .filter(
      (m) =>
        m.group_slug === "gift-cards" ||
        /gift.?card|itunes|steam|playstation|xbox|google-play/i.test(m.slug)
    )
    .filter((m) => !isExcludedNoOnesPaymentMethod(m.slug));
}

/** Ensure a CardType exists for each NoOnes gift-card payment method. */
async function ensureCardTypesFromNoOnes(): Promise<number> {
  const methods = await listGiftCardPaymentMethods();
  let count = 0;

  for (const method of methods) {
    if (isExcludedNoOnesPaymentMethod(method.slug)) continue;
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
    (isOpenEndedCountryTier(target.country) ||
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

async function deleteStaleDenomTiers(
  cardTypeId: string,
  metaByCurrency: Map<string, CurrencyOfferMeta>,
  genericEuroMeta?: CurrencyOfferMeta | null
): Promise<string[]> {
  const noonesRates = await prisma.rate.findMany({
    where: { cardTypeId, speed: "NOONES" },
  });

  const toDelete: string[] = [];
  for (const rate of noonesRates) {
    if (isOpenEndedCountryTier(rate.country)) continue;
    const meta = isEuroTier(rate.country)
      ? genericEuroMeta
      : metaByCurrency.get(rate.currency);
    if (!meta?.ranges.length) continue;
    const matches = meta.ranges.some((r) => r.min === rate.minDenom && r.max === rate.maxDenom);
    if (!matches) {
      toDelete.push(rate.id);
    }
  }
  return toDelete;
}

async function purgeSupersededNoonesRates(
  cardTypeId: string,
  metaByCurrency: Map<string, CurrencyOfferMeta>,
  genericEuroMeta: CurrencyOfferMeta | null | undefined,
  regionLock: ReturnType<typeof resolveCardRegionLock>,
  summary: RateSyncSummary
): Promise<void> {
  const staleDenomIds = await deleteStaleDenomTiers(cardTypeId, metaByCurrency, genericEuroMeta);
  const toDelete = new Set(staleDenomIds);

  const noonesRates = await prisma.rate.findMany({
    where: { cardTypeId, speed: "NOONES" },
    select: {
      id: true,
      active: true,
      country: true,
      currency: true,
      minDenom: true,
      maxDenom: true,
    },
  });

  for (const rate of noonesRates) {
    if (
      rate.minDenom == null &&
      rate.maxDenom == null &&
      !["Other", "Euro"].includes(rate.country) &&
      !isOpenEndedCountryTier(rate.country)
    ) {
      toDelete.add(rate.id);
      continue;
    }

    if (regionLock && !tierMatchesRegionLock(rate, regionLock)) {
      toDelete.add(rate.id);
      continue;
    }

    if (!rate.active) {
      toDelete.add(rate.id);
    }
  }

  if (!toDelete.size) return;

  const result = await prisma.rate.deleteMany({
    where: { id: { in: [...toDelete] } },
  });
  summary.deleted += result.count;
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

  if (target.minDenom == null && target.maxDenom == null && !isOpenEndedCountryTier(target.country)) return;

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

  const { noonesRateRefreshHours, minCountryOffersForDisplay } = await getRateConfig();

  if (!options?.force) {
    const { stale } = await getCardRateStalenessInfo(card.id, noonesRateRefreshHours);
    if (!stale) {
      summary.skipped++;
      return;
    }
  }

  // Marks the start of this card's sync run. Any NoOnes row created/updated
  // below stamps `updatedAt >= syncStartedAt`, so rows still carrying an older
  // `updatedAt` afterwards are leftovers from a previous sync and get purged.
  const syncStartedAt = new Date();

  try {
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
    if (currency === "EUR") continue;
    try {
      metaByCurrency.set(currency, await fetchCurrencyOfferMeta(paymentMethod, currency));
    } catch (err) {
      summary.errors.push(`${card.name}/${currency}: offer meta — ${(err as Error).message}`);
      metaByCurrency.set(currency, { offerCount: 0, ranges: [] });
    }
    await sleep(pauseBetweenTargetsMs);
  }

  let genericEuroMeta: CurrencyOfferMeta | null = null;
  const needsEuro =
    currencies.includes("EUR") ||
    targets.some((t) => t.currency === "EUR" || isEuroTier(t.country)) ||
    Boolean(regionLock?.currencies.includes("EUR"));
  if (needsEuro) {
    try {
      genericEuroMeta = await fetchGenericEuroOfferMeta(paymentMethod);
      metaByCurrency.set("EUR", genericEuroMeta);
    } catch (err) {
      summary.errors.push(`${card.name}/EUR: generic euro meta — ${(err as Error).message}`);
      genericEuroMeta = { offerCount: 0, ranges: [] };
      metaByCurrency.set("EUR", genericEuroMeta);
    }
    await sleep(pauseBetweenTargetsMs);
  }

  const countryMetaOverride = new Map<string, CurrencyOfferMeta>();
  if (genericEuroMeta) countryMetaOverride.set("Euro", genericEuroMeta);

  targets = ensureTargetsForCurrencyMeta(targets, metaByCurrency);
  targets = expandTargetsFromOfferRanges(targets, metaByCurrency, countryMetaOverride);

  if (genericEuroMeta) {
    try {
      await persistCardCurrencyMeta(card.id, "Euro", "EUR", genericEuroMeta);
    } catch (err) {
      summary.errors.push(`${card.name}/EUR: meta persist — ${(err as Error).message}`);
    }
  }

  for (const [currency, meta] of metaByCurrency) {
    if (currency === "EUR") continue;
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
      if (!options?.force && existing && isRateSyncFresh(existing.updatedAt, noonesRateRefreshHours) && !missingBounds) {
        summary.skipped++;
        continue;
      }

      const countryOfferCount = isEuroTier(target.country)
        ? (genericEuroMeta?.offerCount ?? 0)
        : (metaByCurrency.get(target.currency)?.offerCount ?? 0);

      const { storedQuotes, nairaPerUnit } = await fetchStoredQuotesForTarget({
        paymentMethod,
        cardCurrency: target.currency,
        cardAmount: target.sampleAmount,
        medium: target.medium as CardMedium,
        otherCountriesOnly: isOtherCountryTier(target.country),
        genericEuroOnly: isEuroTier(target.country),
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

        if (!options?.force && existing && isRateSyncFresh(existing.updatedAt, noonesRateRefreshHours)) {
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
          if (existing && !isRateSyncFresh(existing.updatedAt, noonesRateRefreshHours)) {
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
      const staleOtherIds = staleOther
        .filter((row) => !isRateSyncFresh(row.updatedAt, noonesRateRefreshHours))
        .map((row) => row.id);
      if (staleOtherIds.length) {
        const removed = await prisma.rate.deleteMany({ where: { id: { in: staleOtherIds } } });
        summary.deleted += removed.count;
      }
    }
  } catch (err) {
    summary.errors.push(`${card.name}/Other: ${(err as Error).message}`);
  }
  }

  // Open-ended Euro tier when generic EUR offers exist but no bounded tiers were stored.
  if (genericEuroMeta && genericEuroMeta.offerCount > 0) {
    try {
      for (const medium of ["PHYSICAL", "ECODE"] as CardMedium[]) {
        const hasBoundedEuro = await prisma.rate.findFirst({
          where: {
            cardTypeId: card.id,
            country: "Euro",
            medium,
            speed: "NOONES",
            active: true,
            OR: [{ minDenom: { not: null } }, { maxDenom: { not: null } }],
          },
        });
        if (hasBoundedEuro) continue;

        const euroTarget: RateSyncTarget = { ...GENERIC_EURO_TIER, medium };
        const existing = await prisma.rate.findFirst({
          where: {
            cardTypeId: card.id,
            country: "Euro",
            medium,
            minDenom: null,
            maxDenom: null,
          },
        });

        if (!options?.force && existing && isRateSyncFresh(existing.updatedAt, noonesRateRefreshHours)) {
          summary.skipped++;
          continue;
        }

        const { storedQuotes, nairaPerUnit } = await fetchStoredQuotesForTarget({
          paymentMethod,
          cardCurrency: GENERIC_EURO_TIER.currency,
          cardAmount: GENERIC_EURO_TIER.sampleAmount,
          medium,
          genericEuroOnly: true,
        });

        if (!nairaPerUnit || nairaPerUnit <= 0) {
          if (existing && !isRateSyncFresh(existing.updatedAt, noonesRateRefreshHours)) {
            await stashCountryTier(card.id, euroTarget, 0);
          }
          summary.skipped++;
          continue;
        }

        const euroOfferCount = await countGenericEuroOffers(paymentMethod, { medium });
        if (!isCountryTierDisplayable(euroOfferCount, minCountryOffersForDisplay)) {
          await stashCountryTier(card.id, euroTarget, euroOfferCount, nairaPerUnit, storedQuotes);
          summary.skipped++;
          continue;
        }

        const result = await upsertRateFromNoOnes(
          card.id,
          euroTarget,
          nairaPerUnit,
          storedQuotes,
          euroOfferCount,
          minCountryOffersForDisplay
        );
        if (result === "created") summary.created++;
        else if (result === "updated") summary.updated++;
        else summary.skipped++;
        await sleep(pauseBetweenTargetsMs);
      }
    } catch (err) {
      summary.errors.push(`${card.name}/Euro: ${(err as Error).message}`);
    }
  }

  await purgeSupersededNoonesRates(card.id, metaByCurrency, genericEuroMeta, regionLock, summary);

  // Delete all previously-synced NoOnes rows for this card that this run did not
  // refresh. On a forced sync we wipe everything older than this run; on a
  // scheduled sync we keep rows still inside the freshness window (those were
  // intentionally skipped this run, not superseded). Manual rates (non-"NOONES"
  // speed) are never touched.
  const previouslySyncedCutoff = options?.force
    ? syncStartedAt
    : new Date(Date.now() - noonesRateRefreshHours * 60 * 60 * 1000);
  const purgedPrevious = await prisma.rate.deleteMany({
    where: {
      cardTypeId: card.id,
      speed: "NOONES",
      updatedAt: { lt: previouslySyncedCutoff },
    },
  });
  summary.deleted += purgedPrevious.count;

  const activeCurrencies = new Set(
    (
      await prisma.rate.findMany({
        where: { cardTypeId: card.id, speed: "NOONES", active: true },
        select: { currency: true },
      })
    ).map((r) => r.currency)
  );
  for (const currency of metaByCurrency.keys()) {
    activeCurrencies.add(currency);
  }
  if (activeCurrencies.size > 0) {
    await prisma.cardCurrencyMeta.deleteMany({
      where: {
        cardTypeId: card.id,
        currency: { notIn: [...activeCurrencies] },
      },
    });
  }

  const visible = await refreshCardCatalogVisibility(card.id);
  if (!visible) summary.drafted++;
  } finally {
    await prisma.cardType.update({
      where: { id: card.id },
      data: { noonesSyncedAt: new Date() },
    });
  }
}

/** Re-apply active flags on stored NoOnes tiers after admin changes the minimum offer threshold. */
export async function reapplyCountryTierVisibility(minOffers: number): Promise<number> {
  const rates = await prisma.rate.findMany({
    where: { speed: "NOONES", countryOfferCount: { not: null } },
    include: { cardType: { select: { slug: true, name: true, noonesPaymentMethod: true } } },
  });

  let updated = 0;
  const cardIds = new Set<string>();
  const activateIds: string[] = [];
  const deactivateIds: string[] = [];

  for (const rate of rates) {
    const regionLock = resolveCardRegionLock(
      rate.cardType.slug,
      rate.cardType.name,
      rate.cardType.noonesPaymentMethod
    );
    let shouldBeActive =
      isCountryTierDisplayable(rate.countryOfferCount ?? 0, minOffers) &&
      (isOpenEndedCountryTier(rate.country) ||
        !(rate.minDenom == null && rate.maxDenom == null));
    if (shouldBeActive && regionLock && !tierMatchesRegionLock(rate, regionLock)) {
      shouldBeActive = false;
    }

    if (rate.active !== shouldBeActive) {
      if (shouldBeActive) activateIds.push(rate.id);
      else deactivateIds.push(rate.id);
      updated++;
    }
    cardIds.add(rate.cardTypeId);
  }

  if (activateIds.length) {
    await prisma.rate.updateMany({ where: { id: { in: activateIds } }, data: { active: true } });
  }
  if (deactivateIds.length) {
    await prisma.rate.updateMany({ where: { id: { in: deactivateIds } }, data: { active: false } });
  }

  for (const cardTypeId of cardIds) {
    await refreshCardCatalogVisibility(cardTypeId);
  }

  return updated;
}

async function syncCardsInBatches(
  cardTypes: { id: string; slug: string; name: string; noonesPaymentMethod: string | null }[],
  summary: RateSyncSummary,
  options?: RateSyncOptions,
  refreshHours?: number
): Promise<void> {
  const { cardsPerBatch, pauseBetweenBatchesMs, pauseBetweenCardsMs } = getNoOnesSyncLimits();

  for (let batchStart = 0; batchStart < cardTypes.length; batchStart += cardsPerBatch) {
    const batch = cardTypes.slice(batchStart, batchStart + cardsPerBatch);

    for (let i = 0; i < batch.length; i++) {
      const card = batch[i];
      if (!options?.force && refreshHours != null) {
        const { stale } = await getCardRateStalenessInfo(card.id, refreshHours);
        if (!stale) {
          summary.skipped++;
          if (isNoOnesSyncActive()) {
            const processed = batchStart + i + 1;
            setNoOnesSyncCurrentCard({ id: card.id, name: card.name }, processed);
            mergeNoOnesSyncSummary(summary);
          }
          if (i < batch.length - 1) await sleep(pauseBetweenCardsMs);
          continue;
        }
      }

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
    deleted: 0,
    drafted: 0,
    published: 0,
    cardTypes: 0,
    errors: [],
  };

  if (!isNoOnesConfigured()) return summary;

  if (isNoOnesSyncActive()) setNoOnesSyncPhase("discovering");

  const scopedSync = Boolean(options?.cardTypeIds?.length);
  if (!scopedSync) {
    try {
      await ensureCardTypesFromNoOnes();
    } catch (err) {
      summary.errors.push(`Card type discovery: ${(err as Error).message}`);
      if (isNoOnesSyncActive()) addNoOnesSyncErrors([summary.errors[summary.errors.length - 1]]);
    }
  }

  let cardTypes = await prisma.cardType.findMany({
    where: noonesLinkedCardWhere(),
    orderBy: cardTypePopularityOrder,
  });

  if (options?.cardTypeIds?.length) {
    const order = new Map(options.cardTypeIds.map((id, index) => [id, index]));
    cardTypes = cardTypes
      .filter((c) => order.has(c.id))
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }

  const { noonesRateRefreshHours } = await getRateConfig();
  if (!options?.force) {
    cardTypes = await filterStaleCardTypes(cardTypes, noonesRateRefreshHours);
  }

  summary.cardTypes = cardTypes.length;

  if (isNoOnesSyncActive()) {
    setNoOnesSyncTotalCards(cardTypes.length);
    setNoOnesSyncPhase("syncing");
  }

  if (!cardTypes.length) {
    return summary;
  }

  await syncCardsInBatches(cardTypes, summary, options, noonesRateRefreshHours);

  await ensureCardSeoLandingPagesPublished();

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
    deleted: 0,
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
    await ensureCardSeoLandingPagesPublished();
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
