"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { money, date, STATUS_COLORS, SELLER_STATUS_DESCRIPTIONS } from "@/lib/format";

export default function TradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/trades").then((d) => setTrades(d.trades)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">My trades</h1>
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
            <Link
              key={t.id}
              href={`/dashboard/trades/${t.id}`}
              className="flex flex-col gap-2 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-semibold">
                  {t.cardType?.name} · {t.country} · {t.medium}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  <span className="font-mono text-xs sm:text-sm">{t.tradeNumber}</span>
                  <span className="mx-1.5">·</span>
                  {t.cardAmount} {t.currency} → {money(t.finalPayout ?? t.quotedPayout, t.payoutCurrency)}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{date(t.createdAt)}</div>
              </div>
              <span
                className={`badge w-fit shrink-0 ${STATUS_COLORS[t.status]}`}
                title={SELLER_STATUS_DESCRIPTIONS[t.status]}
              >
                {t.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
