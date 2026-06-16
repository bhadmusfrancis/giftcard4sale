"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminReferralsPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api("/admin/referrals").then((d) => setData(d.topReferrers));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Referral program</h2>
      <p className="text-sm text-slate-500">
        The referral percentage is configured under <strong>Rates &amp; cards → Exchange rates &amp; deductions</strong>.
        Referrers earn that % of every successful trade their referrals make, for life.
      </p>

      <div className="card overflow-x-auto">
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
                  <div className="text-slate-500">{r.email}</div>
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
