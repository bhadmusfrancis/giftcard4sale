"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money, date } from "@/lib/format";

export default function ReferralsPage() {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api("/referrals").then(setData);
  }, []);

  if (!data) return <p className="text-slate-500">Loading…</p>;

  function copy() {
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Referrals</h1>

      <div className="card p-6">
        <p className="text-slate-600">
          Earn <strong>{data.referralPercent}% of every successful trade</strong> your referrals make — for life.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className="input" readOnly value={data.referralLink} />
          <button onClick={copy} className="btn-primary whitespace-nowrap">{copied ? "Copied!" : "Copy link"}</button>
        </div>
        <p className="mt-2 text-sm text-slate-500">Your code: <strong>{data.referralCode}</strong></p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Referrals" value={String(data.totalReferrals)} />
        <Stat label="USDT earned" value={money(data.totals.USDT, "USDT")} />
        <Stat label="NGN earned" value={money(data.totals.NGN, "NGN")} />
        <Stat label="GHS earned" value={money(data.totals.GHS, "GHS")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 text-lg font-bold">Your referrals</h2>
          <div className="divide-y divide-slate-100">
            {data.referrals.map((r: any) => (
              <div key={r.id} className="flex justify-between py-2 text-sm">
                <span>{r.displayName || "User"}</span>
                <span className="text-slate-500">{date(r.joinedAt)}</span>
              </div>
            ))}
            {data.referrals.length === 0 && <p className="text-sm text-slate-400">No referrals yet.</p>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-3 text-lg font-bold">Earnings</h2>
          <div className="divide-y divide-slate-100">
            {data.earnings.map((e: any) => (
              <div key={e.id} className="flex justify-between py-2 text-sm">
                <span className="text-slate-500">{date(e.createdAt)}</span>
                <span className="font-semibold text-emerald-600">+{money(e.amount, e.currency)}</span>
              </div>
            ))}
            {data.earnings.length === 0 && <p className="text-sm text-slate-400">No earnings yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
