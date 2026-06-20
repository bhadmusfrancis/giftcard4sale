"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { money, date, STATUS_COLORS } from "@/lib/format";

const STATUSES = ["", "PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"];

function TradesInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "");
  const [trades, setTrades] = useState<any[]>([]);

  async function load() {
    const d = await api(`/admin/trades${status ? `?status=${status}` : ""}`);
    setTrades(d.trades);
  }

  useEffect(() => {
    load();
  }, [status]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Trades</h2>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatus(s)}
            className={`badge ${status === s ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {s || "ALL"}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-slate-100">
        {trades.map((t) => (
          <Link key={t.id} href={`/admin/trades/${t.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
            <div>
              <div className="font-semibold">{t.cardType?.name} · {t.country} · {t.medium}</div>
              <div className="text-sm text-slate-500">
                <span className="font-mono">{t.tradeNumber}</span> · {t.user?.displayName || t.user?.email} · {t.cardAmount} {t.currency} → {money(t.finalPayout ?? t.quotedPayout, t.payoutCurrency)} · {date(t.createdAt)}
              </div>
            </div>
            <span className={`badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
          </Link>
        ))}
        {trades.length === 0 && <p className="p-6 text-sm text-slate-400">No trades.</p>}
      </div>
    </div>
  );
}

export default function AdminTradesPage() {
  return (
    <Suspense>
      <TradesInner />
    </Suspense>
  );
}
