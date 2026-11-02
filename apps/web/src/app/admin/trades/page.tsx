"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { STATUS_COLORS, STATUS_DESCRIPTIONS, STATUS_FILTER_LABELS } from "@/lib/format";
import { TradeListItem } from "@/components/PageUi";

const STATUSES = ["", "PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"];

const TRADE_SORTS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "card_asc", label: "Card name A→Z" },
  { value: "card_desc", label: "Card name Z→A" },
  { value: "user_asc", label: "Seller A→Z" },
  { value: "user_desc", label: "Seller Z→A" },
  { value: "amount_desc", label: "Amount ↓" },
  { value: "amount_asc", label: "Amount ↑" },
  { value: "payout_desc", label: "Payout ↓" },
  { value: "payout_asc", label: "Payout ↑" },
] as const;

function TradesInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof TRADE_SORTS)[number]["value"]>("date_desc");
  const [trades, setTrades] = useState<any[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    const [sortKey, dir] = sort.split("_");
    params.set("sort", sortKey);
    params.set("dir", dir);
    const d = await api(`/admin/trades?${params}`);
    setTrades(d.trades);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(t);
  }, [status, q, sort]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="page-title">Trades</h2>
        <span className="text-sm text-slate-500">{trades.length} shown</span>
      </div>
      <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUSES.map((s) => (
          <button
            key={s || "ALL"}
            type="button"
            onClick={() => setStatus(s)}
            title={STATUS_FILTER_LABELS[s]}
            className={status === s ? "chip-on" : "chip-off"}
          >
            {(s || "ALL").replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3">
        <input
          className="input w-full"
          type="search"
          placeholder="Search trade ID, card or seller…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Sort trades"
          className="input w-[8.5rem] sm:w-52"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          {TRADE_SORTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <details className="card p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-800">What do these statuses mean?</summary>
        <dl className="mt-3 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <dt>
              <span className="badge bg-slate-100 text-slate-600">ALL</span>
            </dt>
            <dd className="min-w-0 flex-1 text-slate-600">Every trade, regardless of status.</dd>
          </div>
          {STATUSES.filter(Boolean).map((s) => (
            <div key={s} className="flex flex-wrap items-start gap-2">
              <dt>
                <span className={`badge ${STATUS_COLORS[s]}`}>{s}</span>
              </dt>
              <dd className="min-w-0 flex-1 text-slate-600">{STATUS_DESCRIPTIONS[s]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Trades resold on NoOnes move PENDING → PROCESSING → APPROVED → PAID automatically. The seller&apos;s wallet
          is credited the moment NoOnes releases the funds.
        </p>
      </details>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {trades.map((t) => (
          <TradeListItem
            key={t.id}
            trade={t}
            href={`/admin/trades/${t.id}`}
            seller={t.user?.displayName || t.user?.email}
            statusTitle={STATUS_DESCRIPTIONS[t.status]}
            extraBadge={
              t.reviewFlag ? (
                <span className="badge bg-amber-100 text-amber-800" title={t.reviewFlagReason}>
                  ⚑ Duplicate?
                </span>
              ) : null
            }
          />
        ))}
        {trades.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-400">
            {q.trim() ? "No trades match your search." : "No trades."}
          </p>
        )}
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
