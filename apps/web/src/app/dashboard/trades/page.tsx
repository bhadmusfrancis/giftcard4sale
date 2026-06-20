"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { money, date, STATUS_COLORS } from "@/lib/format";

export default function TradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/trades").then((d) => setTrades(d.trades)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My trades</h1>
        <Link href="/cards" className="btn-primary">New trade</Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : trades.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No trades yet. <Link href="/cards" className="text-brand-700 underline">Sell your first card</Link>.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {trades.map((t) => (
            <Link key={t.id} href={`/dashboard/trades/${t.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <div className="font-semibold">{t.cardType?.name} · {t.country} · {t.medium}</div>
                <div className="text-sm text-slate-500">
                  <span className="font-mono">{t.tradeNumber}</span> · {t.cardAmount} {t.currency} → {money(t.finalPayout ?? t.quotedPayout, t.payoutCurrency)} · {date(t.createdAt)}
                </div>
              </div>
              <span className={`badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
