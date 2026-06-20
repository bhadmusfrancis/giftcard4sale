"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  const [accounts, setAccounts] = useState<any[]>([]);
  const [momoAccounts, setMomoAccounts] = useState<any[]>([]);
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
    }, "Bank account added.");
  }

  async function addMomo(e: React.FormEvent) {
    e.preventDefault();
    await momoAction.run(async () => {
      await api("/me/momo-accounts", { body: { network: momoNetwork, phoneNumber: momoPhone, accountName: momoName } });
      setMomoPhone("");
      setMomoName("");
      await loadAll();
    }, "MoMo account added.");
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
    }, "Withdrawal request submitted and pending approval.");
  }

  if (!user) return null;

  const balances: Record<string, number> = { USDT: user.balanceUsdt, NGN: user.balanceNgn, GHS: user.balanceGhs };
  const minAmount = minWithdrawals[currency] ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["USDT", "NGN", "GHS"] as const).map((cur) => {
          const min = minWithdrawals[cur] ?? 0;
          return (
            <div key={cur} className="card p-6">
              <div className="text-sm text-slate-500">{CURRENCY_LABELS[cur]} balance</div>
              <div className="mt-1 text-2xl font-bold">{money(balances[cur], cur)}</div>
              {min > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Min withdrawal: {money(min, cur)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Withdraw / send */}
        <form onSubmit={submitWithdraw} className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">Send / Withdraw</h2>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
              <option value="NGN">
                Naira → Nigerian bank{minWithdrawals.NGN ? ` (min ${money(minWithdrawals.NGN, "NGN")})` : ""}
              </option>
              <option value="GHS">
                Cedi → Mobile Money (MoMo){minWithdrawals.GHS ? ` (min ${money(minWithdrawals.GHS, "GHS")})` : ""}
              </option>
              <option value="USDT">
                USDT → wallet address{minWithdrawals.USDT ? ` (min ${money(minWithdrawals.USDT, "USDT")})` : ""}
              </option>
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              className="input"
              min={minAmount || undefined}
              step={currency === "USDT" ? "0.000001" : "0.01"}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            {minAmount > 0 && (
              <p className="mt-1 text-xs text-slate-500">Minimum: {money(minAmount, currency)}</p>
            )}
          </div>

          {currency === "NGN" ? (
            <div>
              <label className="label">Destination bank account</label>
              <select className="input" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
                <option value="">Select an account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber} ({a.accountName})</option>
                ))}
              </select>
              {accounts.length === 0 && <p className="mt-1 text-xs text-amber-600">Add a bank account below first.</p>}
            </div>
          ) : currency === "GHS" ? (
            <div>
              <label className="label">Destination MoMo account</label>
              <select className="input" value={momoAccountId} onChange={(e) => setMomoAccountId(e.target.value)} required>
                <option value="">Select MoMo details…</option>
                {momoAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.network} — {a.phoneNumber} ({a.accountName})</option>
                ))}
              </select>
              {momoAccounts.length === 0 && <p className="mt-1 text-xs text-amber-600">Add MoMo payment details below first.</p>}
            </div>
          ) : (
            <div>
              <label className="label">USDT (TRC20) address</label>
              <input className="input" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} required />
            </div>
          )}

          <FormFeedback status={withdrawAction.status} anchorRef={withdrawAction.statusRef} className="mt-2" />
          <button type="submit" className="btn-primary w-full" disabled={withdrawAction.busy}>
            {withdrawAction.busy ? "Submitting…" : "Submit request"}
          </button>
        </form>

        {/* Payout destinations */}
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-bold">Naira bank accounts</h2>
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span>{a.bankName} — {a.accountNumber} ({a.accountName})</span>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => { await api(`/me/bank-accounts/${a.id}`, { method: "DELETE" }); loadAll(); }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {accounts.length === 0 && <p className="text-sm text-slate-400">No saved accounts.</p>}
            </div>
            <form onSubmit={addBank} className="space-y-2 border-t border-slate-100 pt-3">
              <input className="input" placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
              <input className="input" placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
              <input className="input" placeholder="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
              <button type="submit" className="btn-ghost w-full" disabled={bankAction.busy}>
                {bankAction.busy ? "Adding…" : "Add account"}
              </button>
              <FormFeedback status={bankAction.status} anchorRef={bankAction.statusRef} />
            </form>
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-bold">Cedi MoMo accounts</h2>
            <div className="space-y-2">
              {momoAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span>{a.network} — {a.phoneNumber} ({a.accountName})</span>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => { await api(`/me/momo-accounts/${a.id}`, { method: "DELETE" }); loadAll(); }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {momoAccounts.length === 0 && <p className="text-sm text-slate-400">No saved MoMo details.</p>}
            </div>
            <form onSubmit={addMomo} className="space-y-2 border-t border-slate-100 pt-3">
              <select className="input" value={momoNetwork} onChange={(e) => setMomoNetwork(e.target.value as typeof momoNetwork)} required>
                {MOMO_NETWORKS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <input className="input" placeholder="MoMo phone number" value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)} required />
              <input className="input" placeholder="Registered name" value={momoName} onChange={(e) => setMomoName(e.target.value)} required />
              <button type="submit" className="btn-ghost w-full" disabled={momoAction.busy}>
                {momoAction.busy ? "Adding…" : "Add MoMo account"}
              </button>
              <FormFeedback status={momoAction.status} anchorRef={momoAction.statusRef} />
            </form>
          </div>
        </div>
      </div>

      {/* Withdrawals */}
      <div className="card p-6">
        <h2 className="mb-3 text-lg font-bold">Withdrawal history</h2>
        <div className="divide-y divide-slate-100">
          {withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{money(w.amount, w.currency)}</div>
                <div className="text-slate-500">
                  {withdrawalDestination(w)} · {date(w.createdAt)}
                </div>
              </div>
              <span className={`badge ${STATUS_COLORS[w.status]}`}>{w.status}</span>
            </div>
          ))}
          {withdrawals.length === 0 && <p className="text-sm text-slate-400">No withdrawals yet.</p>}
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-6">
        <h2 className="mb-3 text-lg font-bold">Transaction history</h2>
        <div className="divide-y divide-slate-100">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{t.type.replace(/_/g, " ")}</div>
                <div className="text-slate-500">{t.description} · {date(t.createdAt)}</div>
              </div>
              <div className={`font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {t.amount >= 0 ? "+" : ""}{money(t.amount, t.currency)}
              </div>
            </div>
          ))}
          {txns.length === 0 && <p className="text-sm text-slate-400">No transactions yet.</p>}
        </div>
      </div>
    </div>
  );
}
