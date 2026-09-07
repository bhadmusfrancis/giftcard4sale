"use client";

import { RateCalculator } from "@/components/RateCalculator";
import { RateRefreshStatus, type RateFreshnessMeta } from "@/components/RateRefreshStatus";

interface CardRatePanelProps {
  cardName: string;
  cardSellSlug: string;
  initialRates: any[];
  initialConfig: any;
  initialRateMeta?: RateFreshnessMeta;
  initialCurrencyMeta?: any[];
  /** Rates came from the last-known-good snapshot, not a live API response. */
  ratesAreStale?: boolean;
}

export function CardRatePanel({
  cardName,
  cardSellSlug,
  initialRates,
  initialConfig,
  initialRateMeta,
  initialCurrencyMeta = [],
  ratesAreStale = false,
}: CardRatePanelProps) {
  if (!initialRates.length) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-bold">Rate not available yet</h3>
        <p className="mt-2 text-sm text-slate-600">
          Rates for this card are not in our database yet. Browse another card or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ratesAreStale && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing the last rate we recorded for this card. We&rsquo;ll confirm the current rate before your trade is
          paid out.
        </p>
      )}
      <RateCalculator
        cardName={cardName}
        cardSellSlug={cardSellSlug}
        rates={initialRates}
        config={initialConfig}
        rateMeta={initialRateMeta}
        currencyMeta={initialCurrencyMeta}
      />
      {initialRateMeta && <RateRefreshStatus rateMeta={initialRateMeta} />}
    </div>
  );
}
