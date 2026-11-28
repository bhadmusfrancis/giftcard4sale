"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { money } from "@/lib/format";

export type WalletCurrency = "USDT" | "NGN" | "GHS";

const THEMES: Record<
  WalletCurrency,
  { gradient: string; symbol: string; name: string; glow: string }
> = {
  USDT: {
    gradient: "from-teal-500 via-teal-600 to-teal-800",
    symbol: "₮",
    name: "Tether USD",
    glow: "bg-teal-300/20",
  },
  NGN: {
    gradient: "from-emerald-600 via-emerald-700 to-emerald-900",
    symbol: "₦",
    name: "Nigerian Naira",
    glow: "bg-emerald-300/20",
  },
  GHS: {
    gradient: "from-amber-500 via-orange-600 to-orange-800",
    symbol: "₵",
    name: "Ghanaian Cedi",
    glow: "bg-amber-300/20",
  },
};

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 5.1A9.77 9.77 0 0112 4.91c5 0 9.27 3.11 11 7.5a12.7 12.7 0 01-3.17 4.19m-4.15 1.6A9.7 9.7 0 0112 19.09c-5 0-9.27-3.11-11-7.5a12.74 12.74 0 012.54-3.85"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7S3.73 16.06 2.46 12z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Fintech-style wallet balance cards — debit-card gradients, masked-balance
 * toggle and an optional per-currency action (link to wallet or select the
 * withdrawal currency).
 */
export function WalletCards({
  balances,
  minWithdrawals,
  linkToWallet = false,
  onSelect,
  selected,
}: {
  balances: Record<WalletCurrency, number>;
  minWithdrawals?: Partial<Record<WalletCurrency, number>>;
  /** Wrap each card in a link to /dashboard/wallet. */
  linkToWallet?: boolean;
  /** Tap a card to pick that currency (e.g. for the withdraw form). */
  onSelect?: (cur: WalletCurrency) => void;
  /** Currently selected currency, highlighted when onSelect is used. */
  selected?: WalletCurrency;
}) {
  const t = useT();
  const [hidden, setHidden] = useState(false);

  const renderCard = (cur: WalletCurrency) => {
    const theme = THEMES[cur];
    const min = minWithdrawals?.[cur];
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} p-4 text-white shadow-md transition hover:shadow-lg hover:brightness-[1.04] sm:p-5 ${
          selected === cur ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-50" : ""
        }`}
      >
        {/* Decorative card pattern */}
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10" />
        <div className={`pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full ${theme.glow}`} />
        <div className="pointer-events-none absolute right-14 top-8 h-16 w-16 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />

        <div className="relative">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-base font-bold ring-1 ring-white/30 backdrop-blur-sm">
                {theme.symbol}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold tracking-wide">{cur}</div>
                <div className="truncate text-[11px] text-white/70">{t(theme.name)}</div>
              </div>
            </div>
            <button
              type="button"
              aria-label={hidden ? t("Show balances") : t("Hide balances")}
              aria-pressed={hidden}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHidden((h) => !h);
              }}
              className="shrink-0 rounded-full bg-white/15 p-2 text-white/90 ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/25"
            >
              <EyeIcon off={hidden} />
            </button>
          </div>

          <div className="mt-5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
            {t("Available balance")}
          </div>
          <div className="mt-1 break-all text-2xl font-extrabold tracking-tight tabular-nums sm:text-[1.75rem]">
            {hidden ? "••••••" : money(balances[cur], cur)}
          </div>

          <div className="mt-3 flex min-h-6 items-center">
            {min ? (
              <span className="inline-flex items-center rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white/85">
                {t("Min withdrawal")}: {money(min, cur)}
              </span>
            ) : linkToWallet ? (
              <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wider text-white/70">
                {t("Withdraw")} →
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {(["USDT", "NGN", "GHS"] as WalletCurrency[]).map((cur) => {
        if (linkToWallet) {
          return (
            <Link key={cur} href="/dashboard/wallet" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
              {renderCard(cur)}
            </Link>
          );
        }
        if (onSelect) {
          return (
            <button
              key={cur}
              type="button"
              onClick={() => onSelect(cur)}
              className="block rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              {renderCard(cur)}
            </button>
          );
        }
        return <div key={cur}>{renderCard(cur)}</div>;
      })}
    </div>
  );
}
