"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { money, date, STATUS_COLORS, STATUS_DESCRIPTIONS } from "@/lib/format";
import { TradeChat } from "@/components/TradeChat";
import { AttachmentGrid, CodeBlock, DetailRow, SegmentedTabs } from "@/components/PageUi";

const STATUSES = ["PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"];

type Tab = "details" | "manage" | "chat";

function statusButtonLabel(s: string): string {
  if (s === "PAID") return "Approve & Pay";
  if (s === "CANCELLED") return "Cancel trade";
  if (s === "INFO_REQUESTED") return "Request info";
  return `Set ${s.toLowerCase()}`;
}

function statusButtonClass(s: string, current: boolean): string {
  if (current) return "btn-sm bg-slate-900 text-white";
  if (s === "PAID") return "btn-sm bg-emerald-600 text-white hover:bg-emerald-700";
  if (s === "REJECTED" || s === "CANCELLED") return "btn-sm bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100";
  return "btn-sm bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50";
}

export default function AdminTradeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [finalPayout, setFinalPayout] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [tab, setTab] = useState<Tab>("details");
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

  async function dismissFlag() {
    await updateAction.run(async () => {
      await api(`/admin/trades/${id}`, { method: "PATCH", body: { clearReviewFlag: true } });
      await load();
    }, "Review flag dismissed.");
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

  const country = trade.otherCountryName ? `${trade.otherCountryName} (${trade.country})` : trade.country;

  const details = (
    <div className="space-y-4">
      <section className="card p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-bold text-slate-900">Trade</h3>
        <dl>
          <DetailRow label="Trade ID" value={trade.tradeNumber} mono />
          <DetailRow label="Card" value={`${trade.cardType?.name} · ${country} · ${trade.medium}`} />
          <DetailRow label="Amount" value={`${trade.cardAmount} ${trade.currency}`} />
          <DetailRow label="Quoted payout" value={money(trade.quotedPayout, trade.payoutCurrency)} />
          <DetailRow
            label="Rate synced"
            value={
              trade.rateSyncedAt
                ? `${date(trade.rateSyncedAt)}${trade.rateSource ? ` · ${trade.rateSource}` : ""}${trade.rateActive === false ? " (retired)" : ""}`
                : "—"
            }
          />
          <DetailRow label="Receipt" value={trade.receiptType} />
          <DetailRow label="Submitted" value={date(trade.createdAt)} />
        </dl>
      </section>

      <section className="card p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-bold text-slate-900">Seller</h3>
        <dl>
          <DetailRow
            label="Name"
            value={
              trade.user?.id ? (
                <Link href={`/admin/users/${trade.user.id}`} className="text-brand-700 hover:underline">
                  {trade.user?.displayName || "—"}
                </Link>
              ) : (
                trade.user?.displayName || "—"
              )
            }
          />
          <DetailRow label="Email" value={<span className="break-all">{trade.user?.email}</span>} />
          <DetailRow
            label="Scores"
            value={
              <>
                <span className="text-emerald-600">+{trade.user?.goodScore}</span>{" "}
                <span className="text-red-600">-{trade.user?.badScore}</span>
              </>
            }
          />
        </dl>
      </section>

      {(trade.ecodes || trade.pins || trade.attachments?.length > 0) && (
        <section className="card space-y-4 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-900">Card submission</h3>
          {trade.ecodes && <CodeBlock label="E-codes" text={trade.ecodes} />}
          {trade.pins && <CodeBlock label="PINs" text={trade.pins} />}
          {trade.attachments?.length > 0 && <AttachmentGrid items={trade.attachments} />}
        </section>
      )}
    </div>
  );

  const manage = (
    <section className="card space-y-4 p-4 sm:p-5">
      <h3 className="text-sm font-bold text-slate-900">Manage trade</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div>
          <label className="label">Final payout ({trade.payoutCurrency})</label>
          <input
            className="input"
            inputMode="decimal"
            value={finalPayout}
            onChange={(e) => setFinalPayout(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Reason (reject / cancel)</label>
          <input className="input" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Set status</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update(s)}
              disabled={updateAction.busy}
              aria-pressed={trade.status === s}
              title={STATUS_DESCRIPTIONS[s]}
              className={`${statusButtonClass(s, trade.status === s)} py-2.5 ${s === "PAID" ? "col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1" : ""}`}
            >
              {statusButtonLabel(s)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          &quot;Approve &amp; Pay&quot; credits the seller&apos;s wallet immediately. Trades resold on NoOnes are paid
          automatically when the marketplace releases the funds — no manual step needed.
        </p>
      </div>

      <button type="button" onClick={() => update()} disabled={updateAction.busy} className="btn-primary w-full">
        {updateAction.busy ? "Saving…" : "Save final payout"}
      </button>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Chat notifications</div>
          <p className="mt-0.5 text-xs text-slate-500">
            {trade.notificationsMuted
              ? "Muted — no chat alerts for this trade."
              : "Active — alerts send at most once per 15 minutes."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          disabled={updateAction.busy}
          className={`btn-sm shrink-0 bg-white ring-1 ring-slate-200 ${trade.notificationsMuted ? "text-brand-700" : "text-slate-600"}`}
        >
          {trade.notificationsMuted ? "Unmute" : "Mute"}
        </button>
      </div>

      <FormFeedback status={updateAction.status} anchorRef={updateAction.statusRef} />
    </section>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <Link href="/admin/trades" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
        ← Trades
      </Link>

      <header className="card overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-bold leading-tight text-slate-900 sm:text-2xl">
              {trade.cardType?.name}
            </h2>
            <p className="mt-1 break-all font-mono text-xs text-slate-500 sm:text-sm">{trade.tradeNumber}</p>
          </div>
          <span className={`badge shrink-0 ${STATUS_COLORS[trade.status]}`} title={STATUS_DESCRIPTIONS[trade.status]}>
            {trade.status.replace("_", " ")}
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60 sm:grid-cols-3">
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <div className="text-xs text-slate-500">Card value</div>
            <div className="truncate font-bold text-slate-900 sm:text-lg">
              {trade.cardAmount} {trade.currency}
            </div>
          </div>
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <div className="text-xs text-slate-500">Payout</div>
            <div className="truncate font-bold text-brand-700 sm:text-lg">
              {money(trade.finalPayout ?? trade.quotedPayout, trade.payoutCurrency)}
            </div>
          </div>
          <div className="col-span-2 min-w-0 border-t border-slate-100 px-4 py-3 sm:col-span-1 sm:border-t-0 sm:px-5">
            <div className="text-xs text-slate-500">Seller</div>
            <div className="truncate font-semibold text-slate-900">{trade.user?.displayName || trade.user?.email}</div>
          </div>
        </div>
      </header>

      {STATUS_DESCRIPTIONS[trade.status] && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {STATUS_DESCRIPTIONS[trade.status]}
        </div>
      )}

      {trade.reviewFlag && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 break-words">
            <span className="font-semibold">Flagged for review — possible duplicate.</span> {trade.reviewFlagReason}{" "}
            {trade.duplicateOf && (
              <Link href={`/admin/trades/${trade.duplicateOf.id}`} className="font-semibold underline">
                View matched trade {trade.duplicateOf.tradeNumber}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={dismissFlag}
            disabled={updateAction.busy}
            className="btn-sm shrink-0 self-start bg-white text-amber-900 ring-1 ring-amber-300 sm:self-auto"
          >
            Dismiss flag
          </button>
        </div>
      )}

      {(trade.rejectionReason || (trade.duplicateOf && !trade.reviewFlag)) && (
        <div className="break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {trade.rejectionReason && <p>{trade.rejectionReason}</p>}
          {trade.duplicateOf && !trade.reviewFlag && (
            <p className="mt-1">
              Matched earlier trade:{" "}
              <Link href={`/admin/trades/${trade.duplicateOf.id}`} className="font-semibold underline">
                {trade.duplicateOf.tradeNumber}
              </Link>
            </p>
          )}
        </div>
      )}

      <SegmentedTabs<Tab>
        tabs={[
          { id: "details", label: "Details" },
          { id: "manage", label: "Manage" },
          { id: "chat", label: "Chat" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start">
        <aside className={`space-y-4 ${tab === "chat" ? "hidden" : ""} lg:sticky lg:block lg:top-20 lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto lg:pr-1`}>
          <div className={`${tab === "details" ? "" : "hidden"} lg:block`}>{details}</div>
          <div className={`${tab === "manage" ? "" : "hidden"} lg:block`}>{manage}</div>
        </aside>

        {user && (
          <div className={`${tab === "chat" ? "" : "hidden"} lg:sticky lg:top-20 lg:block`}>
            <TradeChat
              tradeId={trade.id}
              myUserId={user.id}
              isAdmin={user.role === "ADMIN"}
              className="h-[calc(100dvh-12rem)] min-h-[22rem] md:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-6.5rem)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
