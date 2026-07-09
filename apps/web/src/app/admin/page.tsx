"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AdminHome() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api("/admin/stats").then(setStats);
  }, []);

  const cards = [
    ["Users", stats?.users, "/admin/users", "All registered accounts"],
    ["Pending trades", stats?.pendingTrades, "/admin/trades?status=PENDING", "Need review or processing"],
    ["Pending withdrawals", stats?.pendingWithdrawals, "/admin/withdrawals?status=PENDING", "Awaiting payout"],
    ["Card types", stats?.cardTypes, "/admin/rates", "Active catalog cards"],
  ] as const;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">Overview</h2>
        <p className="mt-1 text-sm text-slate-500">Snapshot of platform activity</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map(([label, value, href, hint]) => (
          <Link
            key={label}
            href={href}
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-6"
          >
            <div className="text-xs text-slate-500 sm:text-sm">{label}</div>
            <div className="mt-1 text-2xl font-extrabold sm:text-3xl">{value ?? "—"}</div>
            <p className="mt-2 hidden text-xs text-slate-400 sm:block">{hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
