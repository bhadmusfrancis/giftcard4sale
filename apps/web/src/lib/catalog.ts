import catalogFallback from "@/data/catalog-fallback.json";
import { apiServerCached, type SnapshotResult } from "@/lib/snapshotCache";
import type { GiftCard } from "@/components/GiftCardCatalog";

export interface CatalogResponse {
  cards: GiftCard[];
}

const BUNDLED_CATALOG: CatalogResponse = { cards: catalogFallback.cards as GiftCard[] };

function hasCards(data: CatalogResponse): boolean {
  return Array.isArray(data?.cards) && data.cards.length > 0;
}

/**
 * Card list for the catalog, homepage grid and card-page search.
 * Falls back to the last successful response, then to the snapshot bundled at
 * build time, so the catalog is never empty while the API is unavailable.
 */
export async function loadCatalogCards(opts: { revalidate?: number; timeoutMs?: number } = {}) {
  const result = await apiServerCached<CatalogResponse>("/cards", {
    ...opts,
    isUsable: hasCards,
    fallback: BUNDLED_CATALOG,
  });
  return { cards: result.data?.cards ?? [], stale: result.stale, savedAt: result.savedAt };
}

export interface CardRatesResponse {
  card: { id: string; name: string; slug: string; sellSlug: string; description?: string; imageUrl?: string };
  rates: any[];
  config: any;
  rateMeta?: {
    lastUpdatedAt: string | null;
    nextRefreshAt: string | null;
    refreshHours: number;
    isStale: boolean;
  };
  currencyMeta?: {
    country: string;
    currency: string;
    offerCount: number;
    denomRanges: { min: number; max: number }[];
    syncedAt: string;
  }[];
}

/**
 * Rates for a single card. There is no bundled fallback here — stale prices are
 * only acceptable when they were genuinely served to us before.
 */
export async function loadCardRates(slug: string): Promise<SnapshotResult<CardRatesResponse>> {
  return apiServerCached<CardRatesResponse>(`/cards/${slug}`, {
    isUsable: (data) => Array.isArray(data?.rates) && data.rates.length > 0,
  });
}
