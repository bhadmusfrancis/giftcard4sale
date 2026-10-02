"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { money, date, STATUS_COLORS } from "@/lib/format";

const STATUSES = ["", "PENDING", "PROCESSING", "APPROVED", "REJECTED", "PAID"];
const FUNDS_HELD = ["PENDING", "PROCESSING", "APPROVED"];

function withdrawalDestination(w: {
  bankAccount?: { bankName: string; accountNumber: string; accountName?: string } | null;
  momoAccount?: { network: string; phoneNumber: string; accountName?: string } | null;
  destinationAddress?: string | null;
}) {
  if (w.bankAccount) {
    return `${w.bankAccount.bankName} ${w.bankAccount.accountNumber} (${w.bankAccount.accountName})`;
  }
  if (w.momoAccount) {
    return `${w.momoAccount.network} ${w.momoAccount.phoneNumber} (${w.momoAccount.accountName})`;
  }
  return w.destinationAddress ?? "—";
}

function NewWithdrawalForm({ onCreated }: { onCreated: () => void }) {
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [momoAccounts, setMomoAccounts] = useState<any[]>([]);
  const [currency, setCurrency] = useState<"USDT" | "NGN" | "GHS">("NGN");
  const [amount, setAmount] = useState<number>(0);
  const [bankAccountId, setBankAccountId] = useState("");
  const [momoAccountId, setMomoAccountId] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const d = await api(`/admin/users?q=${encodeURIComponent(q)}`);
        setUserResults(d.users.slice(0, 8));
      } catch {
        setUserResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [userQuery]);

  async function selectUser(u: any) {
    setSelectedUser(u);
    setUserQuery("");
    setUserResults([]);
    setBankAccountId("");
    setMomoAccountId("");
    try {
      const d = await api(`/admin/users/${u.id}`);
      setBankAccounts(d.bankAccounts || []);
      setMomoAccounts(d.momoAccounts || []);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return alert("Select a user first.");
    setBusy(true);
    try {
      const body: any = { userId: selectedUser.id, currency, amount, adminNote: adminNote || undefined };
      if (currency === "NGN") body.bankAccountId = bankAccountId;
      else if (currency === "GHS") body.momoAccountId = momoAccountId;
      else body.destinationAddress = destinationAddress;
      await api("/admin/withdrawals", { body });
      setAmount(0);
      setAdminNote("");
      setDestinationAddress("");
      onCreated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-4 sm:p-6">
      <h3 className="font-bold">Create withdrawal for a user</h3>

      {selectedUser ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <span>
            {selectedUser.displayName || selectedUser.email}
            <span className="ml-1 text-slate-400">({selectedUser.email})</span>
          </span>
          <button type="button" onClick={() => setSelectedUser(null)} className="text-xs font-semibold text-red-600">
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            className="input"
            placeholder="Search user by name, email or ID…"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          {userResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-lg">
              {userResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  {u.displayName || u.email} <span className="text-slate-400">({u.email})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Currency</label>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
            <option value="NGN">Naira → bank account</option>
            <option value="GHS">Cedi → MoMo</option>
            <option value="USDT">USDT → wallet address</option>
          </select>
        </div>
        <div>
          <label className="label">Amount</label>
          <input
            type="number"
            className="input"
            min={0}
            step={currency === "USDT" ? "0.000001" : "0.01"}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </div>
      </div>

      {currency === "NGN" ? (
        <div>
          <label className="label">Destination bank account</label>
          <select className="input" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
            <option value="">Select an account…</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber} ({a.accountName})</option>
            ))}
          </select>
          {selectedUser && bankAccounts.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">This user has no saved bank accounts.</p>
          )}
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
          {selectedUser && momoAccounts.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">This user has no saved MoMo details.</p>
          )}
        </div>
      ) : (
        <div>
          <label className="label">USDT (TRC20) address</label>
          <input
            className="input"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            required
          />
        </div>
      )}

      <div>
        <label className="label">Note (visible to the user)</label>
        <textarea
          className="input"
          rows={2}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Optional note shown on the user's withdrawal history"
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={busy || !selectedUser}>
        {busy ? "Creating…" : "Create withdrawal (debits user's wallet)"}
      </button>
    </form>
  );
}

function WithdrawalsInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "PENDING");
  const [items, setItems] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const d = await api(`/admin/withdrawals${status ? `?status=${status}` : ""}`);
    setItems(d.withdrawals);
  }

  useEffect(() => {
    load();
  }, [status]);

  async function act(id: string, newStatus: string) {
    const adminNote = newStatus === "REJECTED" ? prompt("Reason for rejection (refunds the user)") ?? undefined : undefined;
    if (newStatus === "REJECTED" && adminNote === undefined) return;
    try {
      await api(`/admin/withdrawals/${id}`, { method: "PATCH", body: { status: newStatus, adminNote } });
    } catch (err) {
      alert((err as Error).message);
    }
    load();
  }

  async function editNote(w: any) {
    const adminNote = prompt("Note shown to the user (leave empty to clear)", w.adminNote || "");
    if (adminNote === null) return;
    try {
      await api(`/admin/withdrawals/${w.id}`, { method: "PATCH", body: { adminNote } });
    } catch (err) {
      alert((err as Error).message);
    }
    load();
  }

  async function remove(w: any) {
    const held = FUNDS_HELD.includes(w.status);
    if (
      !confirm(
        `Delete this ${money(w.amount, w.currency)} withdrawal for ${w.user?.displayName || w.user?.email}?` +
          (held ? " The held funds will be refunded to the user's wallet." : "")
      )
    )
      return;
    try {
      await api(`/admin/withdrawals/${w.id}`, { method: "DELETE" });
    } catch (err) {
      alert((err as Error).message);
    }
    load();
  }

  async function uploadEvidence(id: string, file: File) {
    try {
      const form = new FormData();
      form.append("evidence", file);
      await api(`/admin/withdrawals/${id}/evidence`, { method: "POST", body: form, isForm: true });
    } catch (err) {
      alert((err as Error).message);
    }
    load();
  }

  async function removeEvidence(id: string) {
    try {
      await api(`/admin/withdrawals/${id}/evidence`, { method: "DELETE" });
    } catch (err) {
      alert((err as Error).message);
    }
    load();
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">Withdrawals</h2>
        <button type="button" onClick={() => setShowNew((v) => !v)} className="btn-ghost text-sm">
          {showNew ? "Close" : "+ New withdrawal"}
        </button>
      </div>

      {showNew && <NewWithdrawalForm onCreated={() => { setShowNew(false); load(); }} />}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "thin" }}>
        {STATUSES.map((s) => (
          <button
            key={s || "ALL"}
            type="button"
            onClick={() => setStatus(s)}
            className={`badge shrink-0 ${status === s ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {s || "ALL"}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {items.map((w) => (
          <div key={w.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="font-semibold">
                {money(w.amount, w.currency)}
                <span className="mx-1.5 font-normal text-slate-400">·</span>
                <span className="font-medium text-slate-700">{w.user?.displayName || w.user?.email}</span>
              </div>
              <div className="mt-1 break-all text-sm text-slate-500">{withdrawalDestination(w)}</div>
              {w.adminNote && <div className="mt-1 break-all text-xs text-amber-700">Note: {w.adminNote}</div>}
              <div className="mt-0.5 text-xs text-slate-400">{date(w.createdAt)}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${STATUS_COLORS[w.status]}`}>{w.status}</span>
              {w.paymentEvidenceUrl && (
                <a
                  href={w.paymentEvidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  View evidence
                </a>
              )}
              <label className="cursor-pointer rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                {w.paymentEvidenceUrl ? "Replace" : "Upload evidence"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadEvidence(w.id, file);
                    e.target.value = "";
                  }}
                />
              </label>
              {w.paymentEvidenceUrl && (
                <button
                  type="button"
                  onClick={() => removeEvidence(w.id)}
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-red-600"
                >
                  Remove
                </button>
              )}
              {["PENDING", "PROCESSING"].includes(w.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => act(w.id, "PROCESSING")}
                    className="rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                  >
                    Processing
                  </button>
                  <button
                    type="button"
                    onClick={() => act(w.id, "PAID")}
                    className="rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-semibold text-green-700"
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    onClick={() => act(w.id, "REJECTED")}
                    className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => editNote(w)}
                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                Note
              </button>
              {w.status !== "PAID" && (
                <button
                  type="button"
                  onClick={() => remove(w)}
                  className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="p-6 text-sm text-slate-400">No withdrawals.</p>}
      </div>
    </div>
  );
}

export default function AdminWithdrawalsPage() {
  return (
    <Suspense>
      <WithdrawalsInner />
    </Suspense>
  );
}
