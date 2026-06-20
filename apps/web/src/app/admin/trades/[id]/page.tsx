"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, date, STATUS_COLORS } from "@/lib/format";
import { TradeChat } from "@/components/TradeChat";

const STATUSES = ["PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"];

export default function AdminTradeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [finalPayout, setFinalPayout] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const d = await api(`/admin/trades/${id}`);
    setTrade(d.trade);
    setFinalPayout(String(d.trade.finalPayout ?? d.trade.quotedPayout));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function update(status?: string) {
    setMsg(null);
    const body: any = {};
    if (status) body.status = status;
    if (finalPayout) body.finalPayout = Number(finalPayout);
    if (rejectionReason) body.rejectionReason = rejectionReason;
    await api(`/admin/trades/${id}`, { method: "PATCH", body });
    setMsg("Updated.");
    load();
  }

  if (!trade) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Trade · {trade.cardType?.name}</h2>
          <p className="mt-1 font-mono text-sm text-slate-500">{trade.tradeNumber}</p>
        </div>
        <span className={`badge ${STATUS_COLORS[trade.status]}`}>{trade.status}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="card space-y-2 p-6 text-sm">
            <Row label="Trade ID" value={trade.tradeNumber} />
            <Row label="Seller" value={`${trade.user?.displayName || ""} (${trade.user?.email})`} />
            <Row label="Seller scores" value={`+${trade.user?.goodScore} good / ${trade.user?.badScore} bad`} />
            <Row label="Card" value={`${trade.cardType?.name} · ${trade.country} · ${trade.medium}`} />
            <Row label="Amount" value={`${trade.cardAmount} ${trade.currency}`} />
            <Row label="Quoted payout" value={money(trade.quotedPayout, trade.payoutCurrency)} />
            <Row label="Receipt" value={trade.receiptType} />
            {trade.ecodes && (
              <div>
                <div className="label">E-codes</div>
                <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3">{trade.ecodes}</pre>
              </div>
            )}
            {trade.attachments?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {trade.attachments.map((a: any) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.filename} className="h-24 w-24 rounded-lg border object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="card space-y-4 p-6">
            <h3 className="font-bold">Manage</h3>
            <div>
              <label className="label">Final payout ({trade.payoutCurrency})</label>
              <input className="input" value={finalPayout} onChange={(e) => setFinalPayout(e.target.value)} />
            </div>
            <div>
              <label className="label">Reason (reject / cancel)</label>
              <input className="input" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => update(s)} className="btn-ghost text-xs">
                  {s === "PAID" ? "Approve & Pay" : s === "CANCELLED" ? "Cancel trade" : `Set ${s}`}
                </button>
              ))}
            </div>
            <button onClick={() => update()} className="btn-primary w-full">Save final payout</button>
            {msg && <p className="text-sm text-brand-700">{msg}</p>}
          </div>
        </div>

        {user && <TradeChat tradeId={trade.id} myUserId={user.id} isAdmin={user.role === "ADMIN"} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
