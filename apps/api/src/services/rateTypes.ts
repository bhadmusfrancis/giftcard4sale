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
}
