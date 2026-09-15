import type { StoredQuotes } from "@gc4s/shared";

/** One card + currency rate produced by a sync source, ready to upsert. */
export interface SyncedCardRate {
  cardName: string;
  /** Source slug used to match an existing CardType before creating one. */
  slugHint?: string;
  currency: string;
  country: string;
  minDenom: number;
  maxDenom: number;
  nairaPerUnit: number;
  storedQuotes: StoredQuotes;
  /**
   * Listings the rate was derived from. Sources that publish one rate per card
   * leave this undefined; marketplaces set it so thin tiers can be held back.
   */
  offerCount?: number;
  /**
   * Distinct traders behind `offerCount`. Several listings from one seller are
   * one opinion, so the publish threshold counts owners, not listings.
   */
  ownerCount?: number;
  /**
   * Whether the brand is specific enough to add to the catalog. Marketplaces
   * also list aggregate categories ("Any Visa, MasterCard and AmEx") that must
   * never become card types.
   */
  catalogCandidate?: boolean;
}

/** Counters reported by a sync run (admin panel, CLI output, progress polling). */
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

export function emptyRateSyncSummary(): RateSyncSummary {
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
