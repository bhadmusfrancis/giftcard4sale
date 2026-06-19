"use client";

import { useEffect, useState } from "react";
import { date } from "@/lib/format";

export interface RateFreshnessMeta {
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  refreshMinutes: number;
  isStale: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "updating soon…";
  const totalSec = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins > 0) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

export function RateRefreshStatus({ rateMeta }: { rateMeta: RateFreshnessMeta }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!rateMeta.lastUpdatedAt) {
    return (
      <p className="text-xs text-slate-500">
        No stored rates yet. Rates are loaded from our marketplace partners on a schedule — check back shortly.
      </p>
    );
  }

  const nextMs =
    now !== null && rateMeta.nextRefreshAt
      ? new Date(rateMeta.nextRefreshAt).getTime() - now
      : null;
  const stale = rateMeta.isStale || (nextMs !== null && nextMs <= 0);

  return (
    <p className="text-xs text-slate-500">
      Rates as of <span className="font-medium text-slate-600">{date(rateMeta.lastUpdatedAt)}</span>
      {" · "}
      {stale ? (
        <span className="text-amber-700">Rates may be outdated — New rate will refresh when available</span>
      ) : (
        <>
          Refresh in{" "}
          <span className="font-medium text-slate-600">
            {nextMs !== null ? formatCountdown(nextMs) : "…"}
          </span>
        </>
      )}
    </p>
  );
}
