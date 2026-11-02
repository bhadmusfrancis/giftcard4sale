"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { SELLER_STATUS_DESCRIPTIONS } from "@/lib/format";
import { TradeListItem } from "@/components/PageUi";

export default function TradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/trades").then((d) => setTrades(d.trades)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">My trades</h1>
        <Link href="/cards" className="btn-primary w-full sm:w-auto">
          New trade
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : trades.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 sm:p-10">
          No trades yet.{" "}
          <Link href="/cards" className="font-semibold text-brand-700 underline">
            Sell your first card
          </Link>
          .
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {trades.map((t) => (
            <TradeListItem
              key={t.id}
              trade={t}
              href={`/dashboard/trades/${t.id}`}
              statusTitle={SELLER_STATUS_DESCRIPTIONS[t.status]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
