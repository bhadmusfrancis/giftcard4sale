"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { PushButton } from "@/components/PushButton";

export default function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hi, {user.displayName || user.email.split("@")[0]} 👋</h1>
          <p className="text-slate-500">Trust level {user.trustLevel}</p>
        </div>
        <PushButton />
      </div>

      {/* Scores */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex items-center justify-between p-6">
          <div>
            <div className="text-sm font-medium text-slate-500">Good transactions</div>
            <div className="text-4xl font-extrabold text-emerald-600">{user.goodScore}</div>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl">✅</div>
        </div>
        <div className="card flex items-center justify-between p-6">
          <div>
            <div className="text-sm font-medium text-slate-500">Bad transactions</div>
            <div className="text-4xl font-extrabold text-red-600">{user.badScore}</div>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-red-100 text-2xl">⛔</div>
        </div>
      </div>

      {/* Wallets */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["USDT", user.balanceUsdt],
          ["NGN", user.balanceNgn],
          ["GHS", user.balanceGhs],
        ].map(([cur, bal]) => (
          <div key={cur as string} className="card p-6">
            <div className="text-sm font-medium text-slate-500">{cur} wallet</div>
            <div className="mt-1 text-2xl font-bold">{money(bal as number, cur as string)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/cards" className="card p-6 hover:shadow-md">
          <div className="text-lg font-bold">Sell a card →</div>
          <p className="text-sm text-slate-500">Calculate a rate and open a trade.</p>
        </Link>
        <Link href="/dashboard/wallet" className="card p-6 hover:shadow-md">
          <div className="text-lg font-bold">Withdraw →</div>
          <p className="text-sm text-slate-500">Send USDT or cash out to your bank.</p>
        </Link>
        <Link href="/dashboard/referrals" className="card p-6 hover:shadow-md">
          <div className="text-lg font-bold">Refer & earn →</div>
          <p className="text-sm text-slate-500">Earn 1% of referrals&apos; trades for life.</p>
        </Link>
      </div>
    </div>
  );
}
