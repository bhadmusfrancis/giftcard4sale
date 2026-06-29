"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { money, date, STATUS_COLORS, STATUS_DESCRIPTIONS } from "@/lib/format";
import { TradeChat } from "@/components/TradeChat";

const STATUSES = ["PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"];

export default function AdminTradeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [finalPayout, setFinalPayout] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const updateAction = useAsyncAction();

  async function load() {
    const d = await api(`/admin/trades/${id}`);
    setTrade(d.trade);
    setFinalPayout(String(d.trade.finalPayout ?? d.trade.quotedPayout));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function update(status?: string) {
    await updateAction.run(async () => {
      const body: any = {};
      if (status) body.status = status;
      if (finalPayout) body.finalPayout = Number(finalPayout);
      if (rejectionReason) body.rejectionReason = rejectionReason;
      await api(`/admin/trades/${id}`, { method: "PATCH", body });
      await load();
    }, status ? `Trade updated to ${status}.` : "Final payout saved.");
  }

  async function toggleMute() {
    await updateAction.run(async () => {
      await api(`/admin/trades/${id}`, {
        method: "PATCH",
        body: { notificationsMuted: !trade.notificationsMuted },
      });
      await load();
    }, trade.notificationsMuted ? "Chat notifications unmuted for this trade." : "Chat notifications muted for this trade.");
  }

  if (!trade) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Trade · {trade.cardType?.name}</h2>
          <p className="mt-1 font-mono text-sm text-slate-500">{trade.tradeNumber}</p>
        </div>
        <span className={`badge ${STATUS_COLORS[trade.status]}`} title={STATUS_DESCRIPTIONS[trade.status]}>{trade.status}</span>
      </div>

      {STATUS_DESCRIPTIONS[trade.status] && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{trade.status}:</span>{" "}
          {STATUS_DESCRIPTIONS[trade.status]}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-stretch xl:min-h-[calc(100vh-11rem)]">
        <aside className="space-y-6 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Trade chat notifications</div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {trade.notificationsMuted
                      ? "Muted — no chat alerts for this trade (15‑min batching still applies when unmuted)."
                      : "Active — chat alerts send at most once per 15 minutes."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={updateAction.busy}
                  className={`btn-ghost shrink-0 text-xs ${trade.notificationsMuted ? "text-brand-700" : "text-slate-600"}`}
                >
                  {updateAction.busy ? "Saving…" : trade.notificationsMuted ? "Unmute" : "Mute"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => update(s)} disabled={updateAction.busy} title={STATUS_DESCRIPTIONS[s]} className="btn-ghost text-xs">
                  {updateAction.busy ? "Saving…" : s === "PAID" ? "Approve & Pay" : s === "CANCELLED" ? "Cancel trade" : `Set ${s}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              &quot;Approve &amp; Pay&quot; credits the seller&apos;s wallet immediately. Trades resold on NoOnes are
              paid automatically when the marketplace releases the funds — no manual step needed.
            </p>
            <button type="button" onClick={() => update()} disabled={updateAction.busy} className="btn-primary w-full">
              {updateAction.busy ? "Saving…" : "Save final payout"}
            </button>
            <FormFeedback status={updateAction.status} anchorRef={updateAction.statusRef} />
          </div>
        </aside>

        {user && (
          <div className="flex min-h-[28rem] flex-col lg:min-h-0">
            <TradeChat tradeId={trade.id} myUserId={user.id} isAdmin={user.role === "ADMIN"} layout="panel" />
          </div>
        )}
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
