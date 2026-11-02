"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminReferralsPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api("/admin/referrals").then((d) => setData(d.topReferrers));
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="page-title">Referral program</h2>
        <p className="mt-1 text-sm text-slate-500">
          The referral percentage is configured under <strong>Rates &amp; cards → Exchange rates &amp; deductions</strong>.
          Referrers earn that % of every successful trade their referrals make, for life.
        </p>
      </div>

      {/* Phones: cards */}
      <div className="space-y-3 sm:hidden">
        {data.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="truncate font-semibold">{r.displayName || "—"}</div>
            <div className="break-all text-sm text-slate-500">{r.email}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
              <div className="min-w-0">
                <div className="text-slate-400">Code</div>
                <div className="truncate font-mono font-semibold text-slate-800">{r.referralCode}</div>
              </div>
              <div>
                <div className="text-slate-400">Referrals</div>
                <div className="font-semibold text-slate-800">{r._count.referrals}</div>
              </div>
              <div>
                <div className="text-slate-400">Earnings</div>
                <div className="font-semibold text-slate-800">{r._count.referralEarnings}</div>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="card p-6 text-center text-sm text-slate-400">No referrers yet.</p>}
      </div>

      {/* Tablet and up: table */}
      <div className="card hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Referrer</th>
              <th className="p-3">Code</th>
              <th className="p-3">Referrals</th>
              <th className="p-3">Earnings count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <div className="font-medium">{r.displayName || "—"}</div>
                  <div className="break-all text-slate-500">{r.email}</div>
                </td>
                <td className="p-3 font-mono">{r.referralCode}</td>
                <td className="p-3">{r._count.referrals}</td>
                <td className="p-3">{r._count.referralEarnings}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-slate-400">No referrers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
