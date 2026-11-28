"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { PushButton } from "@/components/PushButton";
import { TradeCompletionGauge } from "@/components/TradeCompletionGauge";
import { WalletCards } from "@/components/WalletCards";

export default function DashboardHome() {
  const { user } = useAuth();
  const t = useT();
  if (!user) return null;

  const firstName = user.displayName || user.email.split("@")[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{t("Hi, {name}", { name: firstName })}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t("Trust level {level}", { level: user.trustLevel })}</p>
        </div>
        <div className="shrink-0">
          <PushButton />
        </div>
      </div>

      <TradeCompletionGauge completed={user.goodScore} rejected={user.badScore} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{t("Wallets")}</h2>
        <WalletCards
          balances={{ USDT: user.balanceUsdt, NGN: user.balanceNgn, GHS: user.balanceGhs }}
          linkToWallet
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{t("Quick actions")}</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Link
            href="/cards"
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-6"
          >
            <div className="font-bold text-brand-800">{t("Sell a card")}</div>
            <p className="mt-1 text-sm text-slate-500">{t("Calculate a rate and open a trade.")}</p>
          </Link>
          <Link
            href="/dashboard/wallet"
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-6"
          >
            <div className="font-bold text-brand-800">{t("Withdraw")}</div>
            <p className="mt-1 text-sm text-slate-500">{t("Send USDT or cash out to your bank.")}</p>
          </Link>
          <Link
            href="/dashboard/referrals"
            className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-6"
          >
            <div className="font-bold text-brand-800">{t("Refer & earn")}</div>
            <p className="mt-1 text-sm text-slate-500">{t("Earn 1% of referrals' trades for life.")}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
