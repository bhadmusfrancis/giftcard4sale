"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { money } from "@/lib/format";
import { newMetaEventId, trackMeta } from "@/lib/metaPixel";
import { trackGoogleAdsLead } from "@/lib/googleAds";
import { ReceiptType, isEuroAppleRate } from "@gc4s/shared";
import { IndicativeRateCaveat, isLegacyPartnerRate } from "@/components/RateRefreshStatus";
import { cardWarnings } from "@/lib/cardWarnings";

const RECEIPT_LABELS: Record<ReceiptType, string> = {
  NONE: "No receipt",
  CASH: "Receipt — paid with cash",
  DEBIT: "Receipt — paid with debit/card",
};

function NewTradeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();

  const rateId = params.get("rateId") || "";
  const amount = Number(params.get("amount") || 0);
  const payout = (params.get("payout") || "NGN") as "USDT" | "NGN" | "GHS";
  const medium = (params.get("medium") || "PHYSICAL") as "PHYSICAL" | "ECODE";
  const receiptType = (params.get("receiptType") || "NONE") as ReceiptType;
  const initialCountryName = params.get("otherCountryName") || "";

  const [quote, setQuote] = useState<any>(null);
  const [rateInfo, setRateInfo] = useState<any>(null);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [ecodes, setEcodes] = useState("");
  const [pins, setPins] = useState("");
  const [cardDenominations, setCardDenominations] = useState("");
  const [cardCountry, setCardCountry] = useState(initialCountryName);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<FileList | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { busy, status, run, statusRef } = useAsyncAction();

  const needsReceiptUpload = receiptType !== "NONE";
  const needsCardCountry = Boolean(
    rateInfo &&
      (rateInfo.country === "Other" ||
        isEuroAppleRate({ name: rateInfo.cardName }, rateInfo.currency, rateInfo.country))
  );
  const warnings = cardWarnings(rateInfo?.cardName);

  useEffect(() => {
    if (!rateId || !amount) {
      setQuote(null);
      setQuoteReady(false);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);
    setQuoteReady(false);
    setQuote(null);

    api("/cards/quote", {
      body: {
        rateId,
        cardAmount: amount,
        payoutCurrency: payout,
        receiptType,
        preferNoReceipt: receiptType === "NONE",
      },
    })
      .then((d) => {
        if (cancelled) return;
        setQuote(d.quote);
        setRateInfo(d.rate);
        setQuoteReady(true);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteReady(false);
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rateId, amount, payout, receiptType]);

  const receiptSummary = useMemo(() => RECEIPT_LABELS[receiptType] ?? RECEIPT_LABELS.NONE, [receiptType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!quoteReady || !quote) {
      setError("Please wait for your payout to finish calculating.");
      return;
    }
    if (!agree) {
      setError("Please confirm your card is valid and unused.");
      return;
    }
    if (needsReceiptUpload && (!receiptFiles || receiptFiles.length === 0)) {
      setError("You indicated a purchase receipt is available — please upload receipt photo(s).");
      return;
    }
    if (needsCardCountry && !cardCountry.trim()) {
      setError("Please specify your card country.");
      return;
    }
    if (medium === "ECODE" && !ecodes.trim()) {
      setError("Please paste your e-code(s).");
      return;
    }
    if (rateInfo?.requiresPin && !pins.trim()) {
      setError("Please enter the card PIN(s).");
      return;
    }
    if (medium === "PHYSICAL" && !cardDenominations.trim()) {
      setError("Please enter card denominations (e.g. 200x1, 50x4).");
      return;
    }
    if (medium === "PHYSICAL" && (!files || files.length === 0)) {
      setError("Please upload at least one gift card photo.");
      return;
    }

    const result = await run(async () => {
      const fd = new FormData();
      fd.append("rateId", rateId);
      fd.append("cardAmount", String(amount));
      fd.append("payoutCurrency", payout);
      fd.append("medium", medium);
      fd.append("receiptType", receiptType);
      if (cardCountry.trim()) fd.append("otherCountryName", cardCountry.trim());
      if (cardDenominations.trim()) fd.append("cardDenominations", cardDenominations.trim());
      if (ecodes) fd.append("ecodes", ecodes);
      if (pins) fd.append("pins", pins);
      if (notes) fd.append("notes", notes);
      if (files) Array.from(files).forEach((f) => fd.append("images", f));
      if (receiptFiles) Array.from(receiptFiles).forEach((f) => fd.append("receiptImages", f));

      const eventId = newMetaEventId("lead");
      const created = await api<{ trade: { id: string }; autoRejected?: boolean; message?: string }>("/trades", {
        body: fd,
        isForm: true,
        metaEventId: eventId,
      });
      if (created?.trade?.id && !created.autoRejected) {
        trackMeta(
          "Lead",
          {
            content_name: rateInfo?.cardType?.name || rateInfo?.cardName,
            value: quote?.payoutAmount,
            currency: payout,
          },
          { eventID: eventId }
        );
        trackGoogleAdsLead({
          tradeId: created.trade.id,
          value: quote?.payoutAmount,
          currency: payout,
        });
      }
      return created;
    }, (r) =>
      r.autoRejected
        ? r.message || "Trade rejected — this card was already used in a previous trade."
        : "Trade submitted successfully. Redirecting…"
    );

    if (result?.trade?.id) {
      if (result.autoRejected) {
        setError(result.message || "This gift card was already used in a previous trade.");
      }
      router.push(`/dashboard/trades/${result.trade.id}`);
    }
  }

  if (!rateId) {
    return <div className="card p-8 text-center text-slate-500">Start from a card page to open a trade.</div>;
  }

  if (user && !user.emailVerified) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600">Please verify your email before opening a trade.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Open a trade</h1>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {rateInfo?.cardName ? (
              <div className="text-lg font-semibold text-slate-900">{rateInfo.cardName}</div>
            ) : null}
            <div className="text-sm text-slate-500">
              {needsCardCountry && cardCountry.trim() ? cardCountry.trim() : rateInfo?.country}{" "}
              · {medium === "ECODE" ? "E-code" : "Physical"} · {amount} {rateInfo?.currency}
            </div>
            {receiptType !== "NONE" ? (
              <div className="text-sm text-slate-500">Receipt: {receiptSummary}</div>
            ) : null}
            <div className="text-sm text-slate-500">You will receive</div>
            <div className="text-2xl font-bold">
              {quoteLoading || !quoteReady ? "Calculating…" : quote ? money(quote.payoutAmount, payout) : "—"}
            </div>
            {quote?.extraReductionPercent ? (
              <div className="mt-2 max-w-md text-xs text-amber-700">
                A lower rate applies — {amount} {rateInfo?.currency} is not a multiple of 5 or 50.
              </div>
            ) : null}
            {isLegacyPartnerRate(rateInfo?.speed) ? (
              <IndicativeRateCaveat className="mt-2 max-w-md text-xs text-amber-700" />
            ) : null}
          </div>
          <span className="badge bg-amber-100 text-amber-800">{payout}</span>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="card space-y-5 p-6">
        {warnings.map((w) => (
          <div key={w.title} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">{w.title}</p>
            <p className="mt-1">
              {w.body}{" "}
              {w.link && (
                <a href={w.link.href} target="_blank" rel="noreferrer" className="font-medium underline">
                  {w.link.label}
                </a>
              )}
            </p>
          </div>
        ))}

        {needsCardCountry ? (
          <div>
            <label className="label">Card country</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Germany, France, Spain"
              value={cardCountry}
              onChange={(e) => setCardCountry(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              {rateInfo?.country === "Euro" || rateInfo?.currency === "EUR"
                ? "Euro Apple/iTunes cards are locked to the issuing country — enter the country printed on your card."
                : "Enter the country that issued your gift card."}
            </p>
          </div>
        ) : null}

        <div>
          <label className="label">{medium === "ECODE" ? "E-code(s)" : "Card code(s) (optional)"}</label>
          <textarea
            className="input min-h-[120px]"
            placeholder="Paste your gift card code(s) here, one per line"
            value={ecodes}
            onChange={(e) => setEcodes(e.target.value)}
          />
          {medium === "PHYSICAL" && (
            <p className="mt-1 text-xs text-slate-500">
              If the code is printed on the card, type it here as well — it speeds up verification.
            </p>
          )}
        </div>

        {medium === "PHYSICAL" ? (
          <div>
            <label className="label">Card denominations</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 200x1, 50x4, 100x2"
              value={cardDenominations}
              onChange={(e) => setCardDenominations(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              List each denomination and quantity (e.g. one $200 card = 200x1, four $50 cards = 50x4).
            </p>
          </div>
        ) : (
          <div>
            <label className="label">Card denominations (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 100x1"
              value={cardDenominations}
              onChange={(e) => setCardDenominations(e.target.value)}
            />
          </div>
        )}

        {rateInfo?.requiresPin ? (
          <div>
            <label className="label">Card PIN(s)</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Paste the card PIN(s) here, one per line, matching the card order above"
              value={pins}
              onChange={(e) => setPins(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Cards of this type require the PIN along with the code. Enter one PIN per card.
            </p>
          </div>
        ) : null}

        <div>
          <label className="label">
            {medium === "PHYSICAL" ? "Gift card photo(s)" : "Gift card screenshot(s) (optional)"}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="input"
            onChange={(e) => setFiles(e.target.files)}
          />
          <p className="mt-1 text-xs text-slate-500">
            {medium === "PHYSICAL"
              ? "Upload clear photos of every card (front and back). You can select multiple files at once."
              : "Optional screenshots of the e-code email or gift card page."}
          </p>
        </div>

        {needsReceiptUpload ? (
          <div>
            <label className="label">Purchase receipt (required)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="input"
              onChange={(e) => setReceiptFiles(e.target.files)}
            />
            <p className="mt-1 text-xs text-slate-500">
              You confirmed a {receiptType === "CASH" ? "cash" : "debit/card"} receipt is available. Upload clear
              photo(s) of the store receipt.
            </p>
          </div>
        ) : (
          <div>
            <label className="label">Purchase receipt (optional)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="input"
              onChange={(e) => setReceiptFiles(e.target.files)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Upload receipt photo(s) if you have them — this can help verification even for e-codes.
            </p>
          </div>
        )}

        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <label className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
          <span>
            I confirm this is a valid, unused card. I understand that uploading used/bad/test cards will mark my trade as
            failed and damage my trust level and reputation.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormFeedback status={status} anchorRef={statusRef} />
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={busy || quoteLoading || !quoteReady}
        >
          {busy ? "Submitting…" : quoteLoading || !quoteReady ? "Calculating payout…" : "Submit trade"}
        </button>
      </form>
    </div>
  );
}

export default function NewTradePage() {
  return (
    <Suspense>
      <NewTradeInner />
    </Suspense>
  );
}
