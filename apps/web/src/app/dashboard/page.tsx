"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { PushButton } from "@/components/PushButton";

export default function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;

  const firstName = user.displayName || user.email.split("@")[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">Hi, {firstName}</h1>
          <p className="mt-0.5 text-sm text-slate-500">Trust level {user.trustLevel}</p>
        </div>
        <div className="shrink-0">
          <PushButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-6">
          <div className="text-xs font-medium text-slate-500 sm:text-sm">Good trades</div>
          <div className="mt-1 text-3xl font-extrabold text-emerald-600 sm:text-4xl">{user.goodScore}</div>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="text-xs font-medium text-slate-500 sm:text-sm">Bad trades</div>
          <div className="mt-1 text-3xl font-extrabold text-red-600 sm:text-4xl">{user.badScore}</div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Wallets</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            ["USDT", user.balanceUsdt],
            ["NGN", user.balanceNgn],
            ["GHS", user.balanceGhs],
          ].map(([cur, bal]) => (
            <div key={cur as string} className="card p-4 sm:p-6">
              <div className="text-xs font-medium text-slate-500 sm:text-sm">{cur} wallet</div>
              <div className="mt-1 break-all text-xl font-bold sm:text-2xl">
                {money(bal as number, cur as string)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Link
            href="/cards"
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-6"
          >
            <div className="font-bold text-brand-800">Sell a card</div>
            <p className="mt-1 text-sm text-slate-500">Calculate a rate and open a trade.</p>
          </Link>
          <Link
            href="/dashboard/wallet"
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-6"
          >
            <div className="font-bold text-brand-800">Withdraw</div>
            <p className="mt-1 text-sm text-slate-500">Send USDT or cash out to your bank.</p>
          </Link>
          <Link
            href="/dashboard/referrals"
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-6"
          >
            <div className="font-bold text-brand-800">Refer &amp; earn</div>
            <p className="mt-1 text-sm text-slate-500">Earn 1% of referrals&apos; trades for life.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
