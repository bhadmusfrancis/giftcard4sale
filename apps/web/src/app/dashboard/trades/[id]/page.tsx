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

  useEffect(() => {
    api(`/trades/${id}`).then((d) => setTrade(d.trade)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!trade) return <p className="text-slate-500">Trade not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{trade.cardType?.name} trade</h1>
        <span className={`badge ${STATUS_COLORS[trade.status]}`}>{trade.status}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-6">
          <Row label="Card" value={`${trade.cardType?.name} · ${trade.country} · ${trade.medium}`} />
          <Row label="Amount" value={`${trade.cardAmount} ${trade.currency}`} />
          <Row label="Payout" value={money(trade.finalPayout ?? trade.quotedPayout, trade.payoutCurrency)} />
          <Row label="Receipt" value={trade.receiptType} />
          <Row label="Submitted" value={date(trade.createdAt)} />
          {trade.rejectionReason && <Row label="Rejection reason" value={trade.rejectionReason} />}

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
