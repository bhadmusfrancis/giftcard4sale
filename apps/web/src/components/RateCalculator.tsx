"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PayoutCurrency, CardMedium, ReceiptType, RateQuote, StoredQuotes, findRateTierForAmount, findBoundedRateForAmount, buildCountryOptions, formatDenomRanges, defaultAmountForTiers, collectDenomRangesFromRateRows } from "@gc4s/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { RateRefreshStatus, type RateFreshnessMeta } from "@/components/RateRefreshStatus";

interface Rate {
  id: string;
  country: string;
  currency: string;
  minDenom: number | null;
  maxDenom: number | null;
  medium: CardMedium;
  nairaPerUnit: number;
  storedQuotes?: StoredQuotes;
  countryOfferCount?: number;
}

interface Config {
  rates: { ngnPerUsdt: number; ngnPerGhs: number };
  reductions: { nairaReductionPercent: number; usdtReductionPercent: number; ghsReductionPercent: number };
  noonesRateRefreshHours?: number;
}

interface CurrencyMetaRow {
  country: string;
  currency: string;
  offerCount: number;
  denomRanges: { min: number; max: number }[];
  syncedAt: string;
}

export function RateCalculator({
  cardName,
  cardSellSlug,
  rates,
  config,
  rateMeta,
  currencyMeta = [],
}: {
  cardName: string;
  cardSellSlug: string;
  rates: Rate[];
  config: Config;
  rateMeta?: RateFreshnessMeta;
  currencyMeta?: CurrencyMetaRow[];
}) {
  const router = useRouter();
  const { user } = useAuth();

  const countryOptions = useMemo(() => buildCountryOptions(rates, currencyMeta), [rates, currencyMeta]);
  const [country, setCountry] = useState(countryOptions[0]?.country ?? "");
  const [otherCountryName, setOtherCountryName] = useState("");
  const [medium, setMedium] = useState<CardMedium>("PHYSICAL");
  const [amount, setAmount] = useState<number>(100);
  const [payoutCurrency, setPayoutCurrency] = useState<PayoutCurrency>("NGN");
  const [hasReceipt, setHasReceipt] = useState<boolean | null>(null);
  const [isCashReceipt, setIsCashReceipt] = useState<boolean | null>(null);
  const [askReceipt, setAskReceipt] = useState(false);
  const [requiresReceipt, setRequiresReceipt] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [liveQuote, setLiveQuote] = useState<RateQuote | null>(null);
  const [quoteReady, setQuoteReady] = useState(false);

  const selectedCurrency = countryOptions.find((o) => o.country === country)?.currency;

  useEffect(() => {
    if (countryOptions.length && !countryOptions.some((o) => o.country === country)) {
      setCountry(countryOptions[0].country);
    }
  }, [countryOptions, country]);

  // Rates matching the chosen country + medium.
  const candidates = useMemo(
    () => rates.filter((r) => r.country === country && r.medium === medium),
    [rates, country, medium]
  );

  const mediumAvailable = (m: CardMedium) => rates.some((r) => r.country === country && r.medium === m);

  useEffect(() => {
    if (!mediumAvailable(medium)) {
      const alt = (["PHYSICAL", "ECODE"] as CardMedium[]).find(mediumAvailable);
      if (alt) setMedium(alt);
    }
  }, [country, rates, medium]);

  // Bounds must come from quotable rows for this country + medium (not global currency meta).
  const boundedTiers = useMemo(() => collectDenomRangesFromRateRows(candidates), [candidates]);

  const hasCandidates = candidates.length > 0;
  const rangesReady = hasCandidates && boundedTiers.length > 0;
  const advertisedRanges = useMemo(() => formatDenomRanges(boundedTiers), [boundedTiers]);

  // Snap amount to a valid tier before quoting (runs before paint on country/currency change).
  useLayoutEffect(() => {
    if (!rangesReady) return;
    if (!findRateTierForAmount(boundedTiers, amount)) {
      setAmount(defaultAmountForTiers(boundedTiers));
    }
  }, [country, selectedCurrency, medium, boundedTiers, rangesReady]);

  const boundedTier = useMemo(
    () => (rangesReady ? findRateTierForAmount(boundedTiers, amount) : null),
    [boundedTiers, amount, rangesReady]
  );

  const matched = useMemo(
    () => (rangesReady ? findBoundedRateForAmount(candidates, boundedTiers, amount) : null),
    [candidates, boundedTiers, amount, rangesReady]
  );

  const receiptType: ReceiptType = useMemo(() => {
    if (hasReceipt !== true) return "NONE";
    if (isCashReceipt === true) return "CASH";
    if (isCashReceipt === false) return "DEBIT";
    return "NONE";
  }, [hasReceipt, isCashReceipt]);

  const amountOutOfRange = Boolean(rangesReady && amount > 0 && !boundedTier);
  const pricingReady = rangesReady && Boolean(boundedTier) && Boolean(matched);
  const showReceiptPrompt = askReceipt && !amountOutOfRange;

  const isOtherCountry = country === "Other";
  const otherCountryIncomplete = isOtherCountry && !otherCountryName.trim();

  const quote = quoteReady ? liveQuote : null;

  useEffect(() => {
    if (!pricingReady) {
      setAskReceipt(false);
      setRequiresReceipt(false);
      setLiveQuote(null);
      setQuoteReady(false);
      return;
    }

    let cancelled = false;
    setPolicyLoading(true);
    setQuoteReady(false);
    setLiveQuote(null);

    api<{ quote: RateQuote; receiptPolicy: { askReceipt?: boolean; requiresReceipt: boolean }; quoteSource?: string }>(
      "/cards/quote",
      {
        body: {
          rateId: matched!.id,
          cardAmount: amount,
          payoutCurrency,
          receiptType,
          preferNoReceipt: hasReceipt === false,
        },
      }
    )
      .then((d) => {
        if (cancelled) return;
        setLiveQuote(d.quote);
        setQuoteReady(true);
        setAskReceipt(d.receiptPolicy?.askReceipt ?? false);
        setRequiresReceipt(d.receiptPolicy?.requiresReceipt ?? false);
      })
      .catch(() => {
        if (cancelled) return;
        setAskReceipt(false);
        setRequiresReceipt(false);
        setLiveQuote(null);
        setQuoteReady(false);
      })
      .finally(() => {
        if (!cancelled) setPolicyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pricingReady, matched?.id, amount, payoutCurrency, hasReceipt, medium, receiptType]);

  useEffect(() => {
    if (!askReceipt) {
      setHasReceipt(null);
      setIsCashReceipt(null);
    }
  }, [askReceipt]);

  const receiptBlocked = showReceiptPrompt && requiresReceipt && hasReceipt === false;
  const receiptIncomplete =
    showReceiptPrompt && (hasReceipt === null || (hasReceipt === true && isCashReceipt === null));
  const canProceed = Boolean(
    pricingReady &&
      quoteReady &&
      quote &&
      !receiptBlocked &&
      !receiptIncomplete &&
      !policyLoading &&
      !otherCountryIncomplete
  );

  function proceed() {
    if (!matched || !canProceed) return;
    const params = new URLSearchParams({
      rateId: matched.id,
      amount: String(amount),
      payout: payoutCurrency,
      medium,
      receiptType,
    });
    if (isOtherCountry && otherCountryName.trim()) {
      params.set("otherCountryName", otherCountryName.trim());
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/dashboard/trades/new?${params}`)}`);
    } else {
      router.push(`/dashboard/trades/new?${params}`);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-bold">Calculate your {cardName} rate</h3>
        {rateMeta ? <RateRefreshStatus rateMeta={rateMeta} /> : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Card country</label>
          <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
            {countryOptions.map((o) => (
              <option key={o.country} value={o.country}>{o.label}</option>
            ))}
          </select>
          {isOtherCountry ? (
            <div className="mt-3">
              <label className="label">Your card country</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Austria, France, Japan"
                value={otherCountryName}
                onChange={(e) => setOtherCountryName(e.target.value)}
              />
              <p className="mt-1 text-xs text-amber-700">
                Other-country cards may pay a different rate depending on the specific country. The amount shown is an estimate.
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <label className="label">Card type</label>
          <div className="flex gap-2">
            {(["PHYSICAL", "ECODE"] as CardMedium[]).map((m) => (
              <button
                key={m}
                disabled={!mediumAvailable(m)}
                onClick={() => setMedium(m)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                  medium === m ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-300 text-slate-600"
                } disabled:opacity-40`}
              >
                {m === "PHYSICAL" ? "Physical card" : "E-code"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Card amount ({matched?.currency ?? selectedCurrency ?? "USD"})</label>
          <input
            type="number"
            className="input"
            value={amount}
            min={boundedTiers[0]?.minDenom ?? 1}
            max={boundedTiers[0]?.maxDenom ?? undefined}
            onChange={(e) => setAmount(Number(e.target.value))}
            disabled={!rangesReady}
          />
          {!rangesReady ? (
            <p className="mt-1 text-xs text-slate-500">
              {hasCandidates
                ? `Loading accepted amounts for ${selectedCurrency ?? "this currency"}…`
                : "No rates for this country."}
            </p>
          ) : advertisedRanges ? (
            <p className="mt-1 text-xs text-slate-500">Accepted amounts: {advertisedRanges}</p>
          ) : null}
          {amountOutOfRange ? (
            <p className="mt-1 text-sm text-red-600">
              Enter an amount within the offer range{advertisedRanges ? ` (${advertisedRanges})` : ""}.
            </p>
          ) : null}
        </div>

        <div>
          <label className="label">Get paid in</label>
          <select
            className="input"
            value={payoutCurrency}
            onChange={(e) => setPayoutCurrency(e.target.value as PayoutCurrency)}
          >
            <option value="NGN">Naira (NGN)</option>
            <option value="USDT">USDT</option>
            <option value="GHS">Cedi (GHS)</option>
          </select>
        </div>
      </div>

      {showReceiptPrompt ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
          <div>
            <label className="label">Do you have a purchase receipt for this gift card?</label>
            <div className="flex gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => {
                    setHasReceipt(v);
                    if (!v) setIsCashReceipt(null);
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                    hasReceipt === v ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-300 text-slate-600"
                  }`}
                >
                  {v ? "Yes, I have a receipt" : "No receipt"}
                </button>
              ))}
            </div>
          </div>

          {hasReceipt === true ? (
            <div>
              <label className="label">How did you pay for the gift card?</label>
              <div className="flex gap-2">
                {([true, false] as const).map((cash) => (
                  <button
                    key={String(cash)}
                    type="button"
                    onClick={() => setIsCashReceipt(cash)}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                      isCashReceipt === cash
                        ? "border-brand-600 bg-brand-50 text-brand-800"
                        : "border-slate-300 text-slate-600"
                    }`}
                  >
                    {cash ? "Cash" : "Debit / card"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {receiptBlocked ? (
            <p className="text-sm text-red-600">
              Marketplace buyers for this card require a purchase receipt. You cannot open this trade without one.
            </p>
          ) : requiresReceipt && hasReceipt === true ? (
            <p className="text-xs text-slate-500">
              You&apos;ll be asked to upload your receipt photo on the next step.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 rounded-xl bg-slate-900 p-5 text-white">
        {!rangesReady ? (
          <div className="text-slate-300">
            {hasCandidates
              ? `Loading accepted amounts for ${selectedCurrency ?? "this currency"}…`
              : "No rates for this country."}
          </div>
        ) : policyLoading || (pricingReady && !quoteReady) ? (
          <div className="text-slate-300">Calculating your payout…</div>
        ) : quote && pricingReady ? (
          <>
            <div className="text-sm text-slate-300">You will receive</div>
            <div className="text-3xl font-extrabold">{money(quote.payoutAmount, payoutCurrency)}</div>
            {isOtherCountry ? (
              <div className="mt-2 text-xs text-amber-300">
                Estimate only — payout may change based on your card&apos;s country.
              </div>
            ) : null}
            <div className="mt-2 text-xs text-slate-400">
              Rate: {quote.effectiveNairaPerUnit.toLocaleString()} ₦/unit
              {hasReceipt === false ? " • No-receipt offer" : hasReceipt === true ? ` • ${receiptType === "CASH" ? "Cash" : "Debit"} receipt offer` : ""}
              {matched && (matched.minDenom || matched.maxDenom)
                ? ` • Tier ${matched.minDenom ?? "any"}–${matched.maxDenom ?? "any"}`
                : ""}
            </div>
          </>
        ) : !hasCandidates ? (
          <div className="text-slate-300">No rates for this country.</div>
        ) : boundedTier && !matched ? (
          <div className="text-slate-300">
            No offer tier matches {amount} {selectedCurrency ?? boundedTier.currency ?? "USD"} exactly.
            {advertisedRanges ? ` Try an amount in ${advertisedRanges}.` : ""}
          </div>
        ) : amountOutOfRange ? (
          <div className="text-slate-300">
            No rate for {amount} {selectedCurrency ?? matched?.currency ?? "USD"}. Use an amount
            {advertisedRanges ? `: ${advertisedRanges}` : ""}.
          </div>
        ) : (
          <div className="text-slate-300">No rate available for this selection. Try another country/type.</div>
        )}
      </div>

      <button onClick={proceed} disabled={!canProceed} className="btn-primary mt-4 w-full">
        Proceed to open a trade
      </button>
      <p className="mt-3 text-xs text-slate-500">
        ⚠️ Only submit valid, unused cards. Submitting used/bad/test cards will hurt your trust level.
      </p>
    </div>
  );
}
