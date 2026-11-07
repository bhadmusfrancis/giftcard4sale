"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { money, date, STATUS_COLORS, SELLER_STATUS_DESCRIPTIONS } from "@/lib/format";
import { trackGoogleAdsPurchase } from "@/lib/googleAds";
import { TradeChat } from "@/components/TradeChat";
import { PushButton } from "@/components/PushButton";
import { AttachmentGrid, CodeBlock, DetailRow, SegmentedTabs } from "@/components/PageUi";

type Tab = "details" | "chat";

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("details");

  useEffect(() => {
    api(`/trades/${id}`)
      .then((d) => {
        setTrade(d.trade);
        if (d.trade?.status === "INFO_REQUESTED") setTab("chat");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Google Ads Purchase — fires once when trade is approved or paid (seller opens trade)
  useEffect(() => {
    if (!trade || (trade.status !== "APPROVED" && trade.status !== "PAID")) return;
    const value = Number(trade.finalPayout ?? trade.quotedPayout);
    if (!Number.isFinite(value)) return;
    trackGoogleAdsPurchase({
      tradeId: trade.id,
      value,
      currency: trade.payoutCurrency || "NGN",
    });
  }, [trade]);

  async function cancel() {
    if (!trade || !confirm(t("Cancel this trade? This cannot be undone."))) return;
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

  if (loading) return <p className="text-slate-500">{t("Loading…")}</p>;
  if (!trade) return <p className="text-slate-500">{t("Trade not found.")}</p>;

  const country = trade.otherCountryName ? `${trade.otherCountryName} (${trade.country})` : trade.country;
  const payout = money(trade.finalPayout ?? trade.quotedPayout, trade.payoutCurrency);

  return (
    <div className="space-y-4 sm:space-y-5">
      <Link href="/dashboard/trades" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
        ← {t("My trades")}
      </Link>

      <header className="card overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <h1 className="break-words text-lg font-bold leading-tight text-slate-900 sm:text-2xl">
              {trade.cardType?.name}
            </h1>
            <p className="mt-1 break-all font-mono text-xs text-slate-500 sm:text-sm">{trade.tradeNumber}</p>
          </div>
          <span
            className={`badge shrink-0 ${STATUS_COLORS[trade.status]}`}
            title={t(SELLER_STATUS_DESCRIPTIONS[trade.status] || "")}
          >
            {t(trade.status.replace("_", " "))}
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <div className="text-xs text-slate-500">{t("Card value")}</div>
            <div className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {trade.cardAmount} {trade.currency}
            </div>
          </div>
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <div className="text-xs text-slate-500">{t("You receive")}</div>
            <div className="truncate text-base font-bold text-brand-700 sm:text-lg">{payout}</div>
          </div>
        </div>
      </header>

      {SELLER_STATUS_DESCRIPTIONS[trade.status] && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {t(SELLER_STATUS_DESCRIPTIONS[trade.status])}
        </div>
      )}

      <SegmentedTabs<Tab>
        tabs={[
          { id: "details", label: t("Details") },
          { id: "chat", label: t("Chat") },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className={`space-y-4 ${tab === "details" ? "" : "hidden"} lg:block`}>
          <section className="card p-4 sm:p-5">
            <h2 className="mb-1 text-sm font-bold text-slate-900">{t("Trade details")}</h2>
            <dl>
              <DetailRow label={t("Trade ID")} value={trade.tradeNumber} mono />
              <DetailRow label={t("Card")} value={`${trade.cardType?.name} · ${country} · ${trade.medium}`} />
              <DetailRow label={t("Amount")} value={`${trade.cardAmount} ${trade.currency}`} />
              <DetailRow label={t("Payout")} value={payout} />
              <DetailRow label={t("Receipt")} value={trade.receiptType} />
              <DetailRow label={t("Submitted")} value={date(trade.createdAt)} />
            </dl>
          </section>

          {trade.rejectionReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-semibold">{t("Rejection reason")}</div>
              <p className="mt-1 break-words">{trade.rejectionReason}</p>
              {trade.status === "REJECTED" && (
                <p className="mt-2 text-xs">
                  {t("Submitting a previously used gift card or duplicate image affects your bad score and may lead to account suspension.")}
                </p>
              )}
            </div>
          )}

          {(trade.ecodes || trade.pins || trade.attachments?.length > 0) && (
            <section className="card space-y-4 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900">{t("What you submitted")}</h2>
              {trade.ecodes && <CodeBlock label={t("E-codes")} text={trade.ecodes} />}
              {trade.pins && <CodeBlock label={t("PINs")} text={trade.pins} />}
              {trade.attachments?.length > 0 && (
                <div>
                  <div className="mb-1.5 text-sm font-medium text-slate-700">{t("Attachments")}</div>
                  <AttachmentGrid items={trade.attachments} />
                </div>
              )}
            </section>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PushButton hideWhenEnabled />
            {trade.canCancel && (
              <button
                type="button"
                onClick={cancel}
                className="btn-ghost w-full text-red-700 sm:w-auto"
                disabled={cancelling}
              >
                {cancelling ? t("Cancelling…") : t("Cancel trade")}
              </button>
            )}
          </div>
          {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
        </div>

        {user && (
          <div className={`${tab === "chat" ? "" : "hidden"} lg:sticky lg:top-20 lg:block`}>
            <TradeChat
              tradeId={trade.id}
              myUserId={user.id}
              className="h-[calc(100dvh-12rem)] min-h-[22rem] md:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-6.5rem)] lg:max-h-[48rem]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
