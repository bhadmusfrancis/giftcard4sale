"use client";

import { date } from "@/lib/format";

export interface RateFreshnessMeta {
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  refreshMinutes: number;
  isStale: boolean;
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
