"use client";

import { date } from "@/lib/format";

export interface RateFreshnessMeta {
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  refreshHours: number;
  isStale: boolean;
}

/** Partner / leftover NoOnes quotes are not from the Sogo rate sheet. */
export function isNonSogoMarketplaceRate(speed?: string | null): boolean {
  return speed === "PARTNER" || speed === "NOONES";
}

export const INDICATIVE_RATE_CAVEAT =
  "This rate is indicative and may have changed. A newer rate may be used instead.";

export function IndicativeRateCaveat({ className }: { className?: string }) {
  return <p className={className}>{INDICATIVE_RATE_CAVEAT}</p>;
}

export function RateRefreshStatus({ rateMeta }: { rateMeta: RateFreshnessMeta }) {
  if (!rateMeta.lastUpdatedAt) {
    return (
      <p className="text-xs text-slate-500">
        No stored rates yet. Rates are refreshed automatically from our marketplace partners.
      </p>
    );
  }

  return (
    <p className="text-xs text-slate-500">
      Rates as of <span className="font-medium text-slate-600">{date(rateMeta.lastUpdatedAt)}</span>
      {rateMeta.isStale ? (
        <>
          {" · "}
          <span className="text-amber-700">Rate may be outdated, new rate expected.</span>
        </>
      ) : null}
    </p>
  );
}
