"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { ReceiptType } from "@gc4s/shared";

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
  const otherCountryName = params.get("otherCountryName") || "";

  const [quote, setQuote] = useState<any>(null);
  const [rateInfo, setRateInfo] = useState<any>(null);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [ecodes, setEcodes] = useState("");
  const [cardDenominations, setCardDenominations] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<FileList | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsReceiptUpload = medium !== "ECODE" && receiptType !== "NONE";

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
      setError("Please upload a photo of your purchase receipt.");
      return;
    }
    if (rateInfo?.country === "Other" && !otherCountryName.trim()) {
      setError("Please specify your card country.");
      return;
    }
    if (medium === "ECODE" && !ecodes.trim()) {
      setError("Please paste your e-code(s).");
      return;
    }
    if (medium === "PHYSICAL" && !cardDenominations.trim()) {
      setError("Please enter card denominations (e.g. 200x1, 50x4).");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("rateId", rateId);
      fd.append("cardAmount", String(amount));
      fd.append("payoutCurrency", payout);
      fd.append("medium", medium);
      fd.append("receiptType", receiptType);
      if (otherCountryName.trim()) fd.append("otherCountryName", otherCountryName.trim());
      if (cardDenominations.trim()) fd.append("cardDenominations", cardDenominations.trim());
      if (ecodes) fd.append("ecodes", ecodes);
      if (notes) fd.append("notes", notes);
      if (files) Array.from(files).forEach((f) => fd.append("images", f));
      if (receiptFiles) Array.from(receiptFiles).forEach((f) => fd.append("receiptImages", f));

      const { trade } = await api<{ trade: any }>("/trades", { body: fd, isForm: true });
      router.push(`/dashboard/trades/${trade.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
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
              {rateInfo?.country === "Other" && otherCountryName
                ? otherCountryName
                : rateInfo?.country}{" "}
              · {medium === "ECODE" ? "E-code" : "Physical"} · {amount} {rateInfo?.currency}
            </div>
            {receiptType !== "NONE" ? (
              <div className="text-sm text-slate-500">Receipt: {receiptSummary}</div>
            ) : null}
            <div className="text-sm text-slate-500">You will receive</div>
            <div className="text-2xl font-bold">
              {quoteLoading || !quoteReady ? "Calculating…" : quote ? money(quote.payoutAmount, payout) : "—"}
            </div>
          </div>
          <span className="badge bg-amber-100 text-amber-800">{payout}</span>
        </div>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6">
        {medium === "ECODE" ? (
          <div>
            <label className="label">E-code(s)</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Paste your gift card code(s) here, one per line"
              value={ecodes}
              onChange={(e) => setEcodes(e.target.value)}
              required
            />
          </div>
        ) : null}

        {medium === "PHYSICAL" ? (
          <>
            <div>
              <label className="label">Card denominations</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 200x1, 50x4, 100x2"
                value={cardDenominations}
                onChange={(e) => setCardDenominations(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                List each denomination and quantity (e.g. one $200 card = 200x1, four $50 cards = 50x4).
              </p>
            </div>

            <div>
              <label className="label">Upload gift card picture(s)</label>
              <input type="file" accept="image/*" multiple className="input" onChange={(e) => setFiles(e.target.files)} />
              <p className="mt-1 text-xs text-slate-500">Clear photos of the front and back of the card.</p>
            </div>
          </>
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

        {needsReceiptUpload ? (
          <div>
            <label className="label">Upload purchase receipt</label>
            <input
              type="file"
              accept="image/*"
              multiple
              required
              className="input"
              onChange={(e) => setReceiptFiles(e.target.files)}
            />
            <p className="mt-1 text-xs text-slate-500">
              A clear photo of the store receipt showing a {receiptType === "CASH" ? "cash" : "card"} purchase.
            </p>
          </div>
        ) : null}

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
        <button className="btn-primary w-full" disabled={busy || quoteLoading || !quoteReady}>
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
