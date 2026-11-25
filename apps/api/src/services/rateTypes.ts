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
   * E-code rate from the offers that say they accept e-codes. Undefined when
   * none do — the sync then derives it from `nairaPerUnit`.
   */
  ecodeNairaPerUnit?: number;
  /** Distinct sellers behind `ecodeNairaPerUnit`. */
  ecodeOfferCount?: number;
  /**
   * Live offers the marketplace had for this card + currency at sync, counted
   * as distinct sellers — a trader's several listings are one offer. This is
   * the "number of rates" the deduction bands bucket by. Sources that publish
   * one rate per card leave this undefined; marketplaces set it so thin tiers
   * can be held back and its depth recorded on the stored rate row.
   */
  offerCount?: number;
  /**
   * Distinct traders behind the priced median. Several listings from one
   * seller are one opinion, so the publish threshold counts owners, not
   * listings.
   */
  ownerCount?: number;
  /**
   * Whether the brand is specific enough to add to the catalog. Marketplaces
   * also list aggregate categories ("Any Visa, MasterCard and AmEx") that must
   * never become card types.
   */
  catalogCandidate?: boolean;
  /**
   * The marketplace still lists this card + currency, but every listing was
   * excluded (all its sellers are ignored) — the sync retires the stored rows
   * rather than treating the tier as absent and keeping its last rate. The
   * rate fields are dummies; nothing behind them exists to quote.
   */
  exhausted?: boolean;
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
