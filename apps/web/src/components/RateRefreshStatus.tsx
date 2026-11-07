"use client";

import { date } from "@/lib/format";
import { useT } from "@/lib/i18n";

export interface RateFreshnessMeta {
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  refreshHours: number;
  isStale: boolean;
}

/**
 * Legacy partner rows: last-traded prices from contacted partners, which nothing
 * refreshes any more. Live sources (SafeTheTrade, Sogo) quote firm rates.
 */
export function isLegacyPartnerRate(speed?: string | null): boolean {
  return speed === "PARTNER";
}

export const INDICATIVE_RATE_CAVEAT =
  "This rate is indicative and may have changed. A newer rate may be used instead.";

export function IndicativeRateCaveat({ className }: { className?: string }) {
  const t = useT();
  return <p className={className}>{t(INDICATIVE_RATE_CAVEAT)}</p>;
}

export function RateRefreshStatus({ rateMeta }: { rateMeta: RateFreshnessMeta }) {
  const t = useT();
  if (!rateMeta.lastUpdatedAt) {
    return (
      <p className="text-xs text-slate-500">
        {t("No stored rates yet. Rates are refreshed automatically from our marketplace partners.")}
      </p>
    );
  }

  return (
    <p className="text-xs text-slate-500">
      {t("Rates as of")} <span className="font-medium text-slate-600">{date(rateMeta.lastUpdatedAt)}</span>
      {rateMeta.isStale ? (
        <>
          {" · "}
          <span className="text-amber-700">{t("Rate may be outdated, new rate expected.")}</span>
        </>
      ) : null}
    </p>
  );
}
