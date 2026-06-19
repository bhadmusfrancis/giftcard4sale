"use client";

import { RateCalculator } from "@/components/RateCalculator";
import type { RateFreshnessMeta } from "@/components/RateRefreshStatus";

interface CardRatePanelProps {
  cardName: string;
  cardSellSlug: string;
  initialRates: any[];
  initialConfig: any;
  initialRateMeta?: RateFreshnessMeta;
  initialCurrencyMeta?: any[];
}

export function CardRatePanel({
  cardName,
  cardSellSlug,
  initialRates,
  initialConfig,
  initialRateMeta,
  initialCurrencyMeta = [],
}: CardRatePanelProps) {
  if (!initialRates.length) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-bold">Rate not available yet</h3>
        <p className="mt-2 text-sm text-slate-600">
          Rates for this card are not in our database yet. They are refreshed automatically from our
          marketplace partners — check back shortly or browse another card.
        </p>
      </div>
    );
  }

  return (
    <RateCalculator
      cardName={cardName}
      cardSellSlug={cardSellSlug}
      rates={initialRates}
      config={initialConfig}
      rateMeta={initialRateMeta}
      currencyMeta={initialCurrencyMeta}
    />
  );
}
