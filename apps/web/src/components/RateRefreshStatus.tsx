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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!rateMeta.lastUpdatedAt) {
    return (
      <p className="text-xs text-slate-500">
        Rates are syncing from our marketplace partners in the background. Please check back shortly.
      </p>
    );
  }

  const nextMs = rateMeta.nextRefreshAt ? new Date(rateMeta.nextRefreshAt).getTime() - now : 0;
  const stale = rateMeta.isStale || nextMs <= 0;

  return (
    <p className="text-xs text-slate-500">
      Rates as of <span className="font-medium text-slate-600">{date(rateMeta.lastUpdatedAt)}</span>
      {" · "}
      {stale ? (
        <span className="text-amber-700">Refreshing now — showing last stored rates</span>
      ) : (
        <>
          Next refresh in <span className="font-medium text-slate-600">{formatCountdown(nextMs)}</span>
        </>
      )}
    </p>
  );
}
