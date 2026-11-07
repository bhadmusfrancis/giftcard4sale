"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { USDT_WITHDRAWAL_NETWORK_FEE } from "@gc4s/shared";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { money, date, STATUS_COLORS } from "@/lib/format";

const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

const CURRENCY_LABELS: Record<"USDT" | "NGN" | "GHS", string> = {
  USDT: "USDT",
  NGN: "Naira",
  GHS: "Cedi",
};

function withdrawalDestination(w: {
  bankAccount?: { bankName: string; accountNumber: string } | null;
  momoAccount?: { network: string; phoneNumber: string; accountName?: string } | null;
  destinationAddress?: string | null;
}) {
  if (w.bankAccount) return `${w.bankAccount.bankName} ${w.bankAccount.accountNumber}`;
  if (w.momoAccount) {
    const name = w.momoAccount.accountName ? ` (${w.momoAccount.accountName})` : "";
    return `${w.momoAccount.network} ${w.momoAccount.phoneNumber}${name}`;
  }
  return w.destinationAddress ?? "—";
}

export default function WalletPage() {
  const { user, refresh } = useAuth();
  const tr = useT();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [momoAccounts, setMomoAccounts] = useState<any[]>([]);
  const [bankLimit, setBankLimit] = useState(5);
  const [momoLimit, setMomoLimit] = useState(5);
  const [txns, setTxns] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [minWithdrawals, setMinWithdrawals] = useState<Record<string, number>>({
    NGN: 5000,
    GHS: 50,
    USDT: 5,
  });

  // withdraw form
  const [currency, setCurrency] = useState<"USDT" | "NGN" | "GHS">("NGN");
  const [amount, setAmount] = useState<number>(0);
  const [bankAccountId, setBankAccountId] = useState("");
  const [momoAccountId, setMomoAccountId] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const withdrawAction = useAsyncAction();
  const bankAction = useAsyncAction();
  const momoAction = useAsyncAction();

  // add bank form
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  // add MoMo form
  const [momoNetwork, setMomoNetwork] = useState<(typeof MOMO_NETWORKS)[number]>("MTN");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoName, setMomoName] = useState("");

  async function loadAll() {
    const [a, m, t, w] = await Promise.all([
      api("/me/bank-accounts"),
      api("/me/momo-accounts"),
      api("/me/transactions"),
      api("/withdrawals"),
    ]);
    setAccounts(a.accounts);
    setMomoAccounts(m.accounts);
    if (a.limit) setBankLimit(a.limit);
    if (m.limit) setMomoLimit(m.limit);
    setTxns(t.transactions);
    setWithdrawals(w.withdrawals);
    if (w.minWithdrawals) setMinWithdrawals(w.minWithdrawals);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addBank(e: React.FormEvent) {
    e.preventDefault();
    await bankAction.run(async () => {
      await api("/me/bank-accounts", { body: { bankName, accountNumber, accountName } });
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      await loadAll();
    }, tr("Bank account added."));
  }

  async function addMomo(e: React.FormEvent) {
    e.preventDefault();
    await momoAction.run(async () => {
      await api("/me/momo-accounts", { body: { network: momoNetwork, phoneNumber: momoPhone, accountName: momoName } });
      setMomoPhone("");
      setMomoName("");
      await loadAll();
    }, tr("MoMo account added."));
  }

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    await withdrawAction.run(async () => {
      const body: any = { currency, amount };
      if (currency === "NGN") body.bankAccountId = bankAccountId;
      else if (currency === "GHS") body.momoAccountId = momoAccountId;
      else body.destinationAddress = destinationAddress;
      await api("/withdrawals", { body });
      setAmount(0);
      await refresh();
      await loadAll();
    }, tr("Withdrawal request submitted and pending approval."));
  }

  if (!user) return null;

  const balances: Record<string, number> = { USDT: user.balanceUsdt, NGN: user.balanceNgn, GHS: user.balanceGhs };
  const minAmount = minWithdrawals[currency] ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{tr("Wallet")}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["USDT", "NGN", "GHS"] as const).map((cur) => {
          const min = minWithdrawals[cur] ?? 0;
          return (
            <div key={cur} className="card p-6">
              <div className="text-sm text-slate-500">{tr("{cur} balance", { cur: CURRENCY_LABELS[cur] })}</div>
              <div className="mt-1 text-2xl font-bold">{money(balances[cur], cur)}</div>
              {min > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {tr("Min withdrawal")}: {money(min, cur)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Withdraw / send */}
        <form onSubmit={submitWithdraw} className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">{tr("Send / Withdraw")}</h2>
          <div>
            <label className="label">{tr("Currency")}</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
              <option value="NGN">
                {tr("Naira → Nigerian bank")}{minWithdrawals.NGN ? ` (${tr("min")} ${money(minWithdrawals.NGN, "NGN")})` : ""}
              </option>
              <option value="GHS">
                {tr("Cedi → Mobile Money (MoMo)")}{minWithdrawals.GHS ? ` (${tr("min")} ${money(minWithdrawals.GHS, "GHS")})` : ""}
              </option>
              <option value="USDT">
                {tr("USDT → wallet address")}{minWithdrawals.USDT ? ` (${tr("min")} ${money(minWithdrawals.USDT, "USDT")})` : ""}
              </option>
            </select>
          </div>
          <div>
            <label className="label">{tr("Amount")}</label>
            <input
              type="number"
              className="input"
              min={minAmount || undefined}
              step={currency === "USDT" ? "0.000001" : "0.01"}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            {minAmount > 0 && (
              <p className="mt-1 text-xs text-slate-500">{tr("Minimum")}: {money(minAmount, currency)}</p>
            )}
            {currency === "USDT" && (
              <p className="mt-1 text-xs text-slate-500">
                {tr("Network fee")}: {money(USDT_WITHDRAWAL_NETWORK_FEE, "USDT")} — {tr("charged on top of the withdrawal amount.")}
              </p>
            )}
          </div>

          {currency === "NGN" ? (
            <div>
              <label className="label">{tr("Destination bank account")}</label>
              <select className="input" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
                <option value="">{tr("Select an account…")}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber} ({a.accountName})</option>
                ))}
              </select>
              {accounts.length === 0 && <p className="mt-1 text-xs text-amber-600">{tr("Add a bank account below first.")}</p>}
            </div>
          ) : currency === "GHS" ? (
            <div>
              <label className="label">{tr("Destination MoMo account")}</label>
              <select className="input" value={momoAccountId} onChange={(e) => setMomoAccountId(e.target.value)} required>
                <option value="">{tr("Select MoMo details…")}</option>
                {momoAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.network} — {a.phoneNumber} ({a.accountName})</option>
                ))}
              </select>
              {momoAccounts.length === 0 && <p className="mt-1 text-xs text-amber-600">{tr("Add MoMo payment details below first.")}</p>}
            </div>
          ) : (
            <div>
              <label className="label">{tr("USDT (TRC20) address")}</label>
              <input className="input" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} required />
            </div>
          )}

          <FormFeedback status={withdrawAction.status} anchorRef={withdrawAction.statusRef} className="mt-2" />
          <button type="submit" className="btn-primary w-full" disabled={withdrawAction.busy}>
            {withdrawAction.busy ? tr("Submitting…") : tr("Submit request")}
          </button>
        </form>

        {/* Payout destinations */}
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-bold">{tr("Naira bank accounts")}</h2>
            <p className="text-xs text-slate-500">
              {tr("{count} of {limit} saved", { count: accounts.length, limit: bankLimit })}
            </p>
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span>{a.bankName} — {a.accountNumber} ({a.accountName})</span>
                </div>
              ))}
              {accounts.length === 0 && <p className="text-sm text-slate-400">{tr("No saved accounts.")}</p>}
            </div>
            {accounts.length < bankLimit ? (
              <form onSubmit={addBank} className="space-y-2 border-t border-slate-100 pt-3">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {tr("Saved bank accounts can't be removed once added — double-check the details before saving.")}
                </p>
                <input className="input" placeholder={tr("Bank name")} value={bankName} onChange={(e) => setBankName(e.target.value)} required />
                <input className="input" placeholder={tr("Account number")} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
                <input className="input" placeholder={tr("Account name")} value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
                <button type="submit" className="btn-ghost w-full" disabled={bankAction.busy}>
                  {bankAction.busy ? tr("Adding…") : tr("Add account")}
                </button>
                <FormFeedback status={bankAction.status} anchorRef={bankAction.statusRef} />
              </form>
            ) : (
              <p className="border-t border-slate-100 pt-3 text-sm text-slate-500">
                {tr("You've reached the maximum of {limit} bank accounts. Contact support if you need changes.", { limit: bankLimit })}
              </p>
            )}
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-bold">{tr("Cedi MoMo accounts")}</h2>
            <p className="text-xs text-slate-500">
              {tr("{count} of {limit} saved", { count: momoAccounts.length, limit: momoLimit })}
            </p>
            <div className="space-y-2">
              {momoAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span>{a.network} — {a.phoneNumber} ({a.accountName})</span>
                </div>
              ))}
              {momoAccounts.length === 0 && <p className="text-sm text-slate-400">{tr("No saved MoMo details.")}</p>}
            </div>
            {momoAccounts.length < momoLimit ? (
              <form onSubmit={addMomo} className="space-y-2 border-t border-slate-100 pt-3">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {tr("Saved MoMo accounts can't be removed once added — double-check the details before saving.")}
                </p>
                <select className="input" value={momoNetwork} onChange={(e) => setMomoNetwork(e.target.value as typeof momoNetwork)} required>
                  {MOMO_NETWORKS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <input className="input" placeholder={tr("MoMo phone number")} value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)} required />
                <input className="input" placeholder={tr("Registered name")} value={momoName} onChange={(e) => setMomoName(e.target.value)} required />
                <button type="submit" className="btn-ghost w-full" disabled={momoAction.busy}>
                  {momoAction.busy ? tr("Adding…") : tr("Add MoMo account")}
                </button>
                <FormFeedback status={momoAction.status} anchorRef={momoAction.statusRef} />
              </form>
            ) : (
              <p className="border-t border-slate-100 pt-3 text-sm text-slate-500">
                {tr("You've reached the maximum of {limit} MoMo accounts. Contact support if you need changes.", { limit: momoLimit })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawals */}
      <div className="card p-6">
        <h2 className="mb-3 text-lg font-bold">{tr("Withdrawal history")}</h2>
        <div className="divide-y divide-slate-100">
          {withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{money(w.amount, w.currency)}</div>
                <div className="text-slate-500">
                  {withdrawalDestination(w)} · {date(w.createdAt)}
                </div>
                {w.fee > 0 && (
                  <div className="text-xs text-slate-400">+{money(w.fee, w.currency)} {tr("network fee")}</div>
                )}
                {w.adminNote && (
                  <div className="mt-0.5 text-xs text-amber-700">{tr("Note")}: {w.adminNote}</div>
                )}
                {w.paymentEvidenceUrl && (
                  <a
                    href={w.paymentEvidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    {tr("View payment evidence")}
                  </a>
                )}
              </div>
              <span className={`badge ${STATUS_COLORS[w.status]}`}>{tr(w.status)}</span>
            </div>
          ))}
          {withdrawals.length === 0 && <p className="text-sm text-slate-400">{tr("No withdrawals yet.")}</p>}
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-6">
        <h2 className="mb-3 text-lg font-bold">{tr("Transaction history")}</h2>
        <div className="divide-y divide-slate-100">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{tr(t.type.replace(/_/g, " "))}</div>
                <div className="text-slate-500">{t.description} · {date(t.createdAt)}</div>
              </div>
              <div className={`font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {t.amount >= 0 ? "+" : ""}{money(t.amount, t.currency)}
              </div>
            </div>
          ))}
          {txns.length === 0 && <p className="text-sm text-slate-400">{tr("No transactions yet.")}</p>}
        </div>
      </div>
    </div>
  );
}
