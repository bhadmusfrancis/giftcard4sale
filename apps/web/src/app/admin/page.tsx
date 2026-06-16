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
    ["Users", stats?.users, "/admin/users"],
    ["Pending trades", stats?.pendingTrades, "/admin/trades?status=PENDING"],
    ["Pending withdrawals", stats?.pendingWithdrawals, "/admin/withdrawals?status=PENDING"],
    ["Card types", stats?.cardTypes, "/admin/rates"],
  ] as const;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} className="card p-6 hover:shadow-md">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-1 text-3xl font-extrabold">{value ?? "—"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
