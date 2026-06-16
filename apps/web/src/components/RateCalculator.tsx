"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateRateQuote, PayoutCurrency, CardMedium } from "@gc4s/shared";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";

interface Rate {
  id: string;
  country: string;
  currency: string;
  minDenom: number | null;
  maxDenom: number | null;
  medium: CardMedium;
  nairaPerUnit: number;
}

interface Config {
  rates: { ngnPerUsdt: number; ngnPerGhs: number };
  reductions: { nairaReductionPercent: number; fxReductionPercent: number };
}

export function RateCalculator({
  cardName,
  cardSellSlug,
  rates,
  config,
}: {
  cardName: string;
  cardSellSlug: string;
  rates: Rate[];
  config: Config;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const countries = useMemo(() => Array.from(new Set(rates.map((r) => r.country))), [rates]);
  const [country, setCountry] = useState(countries[0] ?? "");
  const [medium, setMedium] = useState<CardMedium>("PHYSICAL");
  const [amount, setAmount] = useState<number>(100);
  const [payoutCurrency, setPayoutCurrency] = useState<PayoutCurrency>("NGN");

  // Rates matching the chosen country + medium.
  const candidates = useMemo(
    () => rates.filter((r) => r.country === country && r.medium === medium),
    [rates, country, medium]
  );

  // Pick the tier whose [min,max] contains the amount, else the first.
  const matched = useMemo(() => {
    const inRange = candidates.find((r) => {
      const okMin = r.minDenom == null || amount >= r.minDenom;
      const okMax = r.maxDenom == null || amount <= r.maxDenom;
      return okMin && okMax;
    });
    return inRange ?? candidates[0];
  }, [candidates, amount]);

  const quote = useMemo(() => {
    if (!matched || !amount) return null;
    return calculateRateQuote({
      nairaPerUnit: matched.nairaPerUnit,
      cardAmount: amount,
      payoutCurrency,
      medium,
      rates: config.rates,
      reductions: config.reductions,
    });
  }, [matched, amount, payoutCurrency, medium, config]);

  const mediumAvailable = (m: CardMedium) => rates.some((r) => r.country === country && r.medium === m);

  function proceed() {
    if (!matched) return;
    const params = new URLSearchParams({
      rateId: matched.id,
      amount: String(amount),
      payout: payoutCurrency,
      medium,
    });
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/dashboard/trades/new?${params}`)}`);
    } else {
      router.push(`/dashboard/trades/new?${params}`);
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold">Calculate your {cardName} rate</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Card country</label>
          <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
          <label className="label">Card amount ({matched?.currency ?? "USD"})</label>
          <input
            type="number"
            className="input"
            value={amount}
            min={1}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
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

      <div className="mt-6 rounded-xl bg-slate-900 p-5 text-white">
        {quote ? (
          <>
            <div className="text-sm text-slate-300">You will receive</div>
            <div className="text-3xl font-extrabold">{money(quote.payoutAmount, payoutCurrency)}</div>
            <div className="mt-2 text-xs text-slate-400">
              Rate: {quote.effectiveNairaPerUnit.toLocaleString()} ₦/unit (after {quote.reductionPercent}% deduction)
              {matched && (matched.minDenom || matched.maxDenom)
                ? ` • Tier ${matched.minDenom ?? "any"}–${matched.maxDenom ?? "any"}`
                : ""}
            </div>
          </>
        ) : (
          <div className="text-slate-300">No rate available for this selection. Try another country/type.</div>
        )}
      </div>

      <button onClick={proceed} disabled={!quote} className="btn-primary mt-4 w-full">
        Proceed to open a trade
      </button>
      <p className="mt-3 text-xs text-slate-500">
        ⚠️ Only submit valid, unused cards. Submitting used/bad/test cards will hurt your trust level.
      </p>
    </div>
  );
}
