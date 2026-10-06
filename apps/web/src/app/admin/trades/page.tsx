"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { money, date, STATUS_COLORS, STATUS_DESCRIPTIONS, STATUS_FILTER_LABELS } from "@/lib/format";

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
      <h2 className="text-xl font-bold sm:text-2xl">Trades</h2>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "thin" }}>
        {STATUSES.map((s) => (
          <button
            key={s || "ALL"}
            type="button"
            onClick={() => setStatus(s)}
            title={STATUS_FILTER_LABELS[s]}
            className={`badge shrink-0 ${status === s ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {s || "ALL"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input w-full"
          placeholder="Search by trade ID, card name, or seller…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input shrink-0 sm:w-52"
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
          <Link
            key={t.id}
            href={`/admin/trades/${t.id}`}
            className="flex flex-col gap-2 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="font-semibold">
                {t.cardType?.name} · {t.country} · {t.medium}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                <span className="font-mono text-xs sm:text-sm">{t.tradeNumber}</span>
                <span className="mx-1.5">·</span>
                {t.user?.displayName || t.user?.email}
              </div>
              <div className="mt-0.5 text-sm text-slate-500">
                {t.cardAmount} {t.currency} → {money(t.finalPayout ?? t.quotedPayout, t.payoutCurrency)}
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-xs text-slate-400">{date(t.createdAt)}</span>
              </div>
            </div>
            <span className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <span className={`badge w-fit ${STATUS_COLORS[t.status]}`} title={STATUS_DESCRIPTIONS[t.status]}>
                {t.status}
              </span>
              {t.reviewFlag && (
                <span className="badge w-fit bg-amber-100 text-amber-800" title={t.reviewFlagReason}>
                  ⚑ Possible duplicate
                </span>
              )}
            </span>
          </Link>
        ))}
        {trades.length === 0 && (
          <p className="p-6 text-sm text-slate-400">{q.trim() ? "No trades match your search." : "No trades."}</p>
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
