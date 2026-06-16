"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, date, STATUS_COLORS } from "@/lib/format";

export default function WalletPage() {
  const { user, refresh } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // withdraw form
  const [currency, setCurrency] = useState<"USDT" | "NGN" | "GHS">("NGN");
  const [amount, setAmount] = useState<number>(0);
  const [bankAccountId, setBankAccountId] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // add bank form
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  async function loadAll() {
    const [a, t, w] = await Promise.all([
      api("/me/bank-accounts"),
      api("/me/transactions"),
      api("/withdrawals"),
    ]);
    setAccounts(a.accounts);
    setTxns(t.transactions);
    setWithdrawals(w.withdrawals);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addBank(e: React.FormEvent) {
    e.preventDefault();
    await api("/me/bank-accounts", { body: { bankName, accountNumber, accountName } });
    setBankName(""); setAccountNumber(""); setAccountName("");
    loadAll();
  }

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const body: any = { currency, amount };
      if (currency === "NGN") body.bankAccountId = bankAccountId;
      else body.destinationAddress = destinationAddress;
      await api("/withdrawals", { body });
      setMsg("Withdrawal request submitted and pending approval.");
      setAmount(0);
      await refresh();
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (!user) return null;

  const balances: Record<string, number> = { USDT: user.balanceUsdt, NGN: user.balanceNgn, GHS: user.balanceGhs };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["USDT", "NGN", "GHS"] as const).map((cur) => (
          <div key={cur} className="card p-6">
            <div className="text-sm text-slate-500">{cur} balance</div>
            <div className="mt-1 text-2xl font-bold">{money(balances[cur], cur)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Withdraw / send */}
        <form onSubmit={submitWithdraw} className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">Send / Withdraw</h2>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
              <option value="NGN">Naira → Nigerian bank</option>
              <option value="USDT">USDT → wallet address</option>
              <option value="GHS">Cedi → mobile money / address</option>
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input type="number" className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
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
          ) : (
            <div>
              <label className="label">{currency === "USDT" ? "USDT (TRC20) address" : "Mobile money number / address"}</label>
              <input className="input" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} required />
            </div>
          )}

          {msg && <p className="text-sm text-brand-700">{msg}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full">Submit request</button>
        </form>

        {/* Bank accounts */}
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">Naira bank accounts</h2>
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span>{a.bankName} — {a.accountNumber} ({a.accountName})</span>
                <button
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
            <button className="btn-ghost w-full">Add account</button>
          </form>
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
                  {w.bankAccount ? `${w.bankAccount.bankName} ${w.bankAccount.accountNumber}` : w.destinationAddress} · {date(w.createdAt)}
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
