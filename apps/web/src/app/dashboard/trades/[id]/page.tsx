"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, date, STATUS_COLORS } from "@/lib/format";
import { TradeChat } from "@/components/TradeChat";

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    api(`/trades/${id}`).then((d) => setTrade(d.trade)).finally(() => setLoading(false));
  }, [id]);

  async function cancel() {
    if (!trade || !confirm("Cancel this trade? This cannot be undone.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const d = await api(`/trades/${trade.id}/cancel`, { method: "POST", body: {} });
      setTrade(d.trade);
    } catch (err) {
      setCancelError((err as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!trade) return <p className="text-slate-500">Trade not found.</p>;

  const cancelCheck = trade.canCancel ? { ok: true as const } : { ok: false as const, error: "This trade cannot be cancelled" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{trade.cardType?.name} trade</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{trade.tradeNumber}</p>
        </div>
        <span className={`badge ${STATUS_COLORS[trade.status]}`}>{trade.status}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-6">
          <Row label="Trade ID" value={trade.tradeNumber} />
          <Row label="Card" value={`${trade.cardType?.name} · ${trade.country} · ${trade.medium}`} />
          <Row label="Amount" value={`${trade.cardAmount} ${trade.currency}`} />
          <Row label="Payout" value={money(trade.finalPayout ?? trade.quotedPayout, trade.payoutCurrency)} />
          <Row label="Receipt" value={trade.receiptType} />
          <Row label="Submitted" value={date(trade.createdAt)} />
          {trade.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-semibold">Rejection reason</div>
              <p className="mt-1">{trade.rejectionReason}</p>
              {trade.status === "REJECTED" && (
                <p className="mt-2 text-xs">
                  Submitting a previously used gift card or duplicate image affects your bad score and may lead to
                  account suspension.
                </p>
              )}
            </div>
          )}

          {cancelCheck.ok && (
            <div className="border-t border-slate-100 pt-4">
              <button type="button" onClick={cancel} className="btn-ghost text-red-700" disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel trade"}
              </button>
              {cancelError && <p className="mt-2 text-sm text-red-600">{cancelError}</p>}
            </div>
          )}

          {trade.ecodes && (
            <div>
              <div className="label">E-codes</div>
              <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{trade.ecodes}</pre>
            </div>
          )}

          {trade.attachments?.length > 0 && (
            <div>
              <div className="label">Attachments</div>
              <div className="flex flex-wrap gap-2">
                {trade.attachments.map((a: any) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.filename} className="h-20 w-20 rounded-lg object-cover border" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {user && <TradeChat tradeId={trade.id} myUserId={user.id} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
