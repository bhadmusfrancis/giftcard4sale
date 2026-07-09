"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { money, date } from "@/lib/format";

const STATUS_FILTERS = ["ALL", "ACTIVE", "SUSPENDED", "BANNED"] as const;

function statusBadge(status: string) {
  if (status === "BANNED") return "bg-red-100 text-red-800";
  if (status === "SUSPENDED") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-800";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "USER" });
  const createAction = useAsyncAction();

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const d = await api(`/admin/users${params.toString() ? `?${params}` : ""}`);
    setUsers(d.users);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(t);
  }, [q, statusFilter]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    await createAction.run(async () => {
      await api("/admin/users", { body: form });
      setShowCreate(false);
      setForm({ email: "", password: "", displayName: "", role: "USER" });
      await load();
    }, "User created.");
  }

  async function deleteUser(id: string) {
    if (!confirm("Permanently delete this user?")) return;
    setDeletingUserId(id);
    try {
      await api(`/admin/users/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingUserId((cur) => (cur === id ? null : cur));
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">Users</h2>
        <button type="button" onClick={() => setShowCreate((s) => !s)} className="btn-primary w-full sm:w-auto">
          {showCreate ? "Cancel" : "New user"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createUser} className="card grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
          <input
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Display name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="btn-primary sm:col-span-2" disabled={createAction.busy}>
            {createAction.busy ? "Creating…" : "Create"}
          </button>
          <FormFeedback status={createAction.status} anchorRef={createAction.statusRef} className="sm:col-span-2" />
        </form>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "thin" }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`badge shrink-0 ${statusFilter === s ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <input
        className="input w-full"
        placeholder="Search by email, name, referral code, or ID"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <div key={u.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{u.displayName || "—"}</div>
                <div className="truncate text-sm text-slate-500">{u.email}</div>
              </div>
              <span className={`badge shrink-0 ${statusBadge(u.accountStatus || "ACTIVE")}`}>
                {u.accountStatus || "ACTIVE"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {!u.emailVerified && <span className="badge bg-amber-100 text-amber-800">unverified</span>}
              {u.role === "ADMIN" && <span className="badge bg-slate-800 text-white">admin</span>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <dt className="text-slate-400">Last login</dt>
                <dd>{u.lastLoginAt ? date(u.lastLoginAt) : "Never"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Scores</dt>
                <dd>
                  <span className="font-semibold text-emerald-600">+{u.goodScore}</span>{" "}
                  <span className="font-semibold text-red-600">-{u.badScore}</span>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400">Wallets</dt>
                <dd className="mt-0.5 space-y-0.5">
                  <div>{money(u.balanceUsdt, "USDT")}</div>
                  <div>{money(u.balanceNgn, "NGN")}</div>
                  <div>{money(u.balanceGhs, "GHS")}</div>
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/users/${u.id}`} className="btn-ghost flex-1 text-center text-brand-700">
                Manage
              </Link>
              {u.role !== "ADMIN" && (
                <button
                  type="button"
                  onClick={() => void deleteUser(u.id)}
                  disabled={deletingUserId === u.id}
                  className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 disabled:opacity-60"
                >
                  {deletingUserId === u.id ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <p className="card p-6 text-center text-sm text-slate-400">
            {q.trim() ? "No users match your search." : "No users found."}
          </p>
        )}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last login</th>
              <th className="p-3">Trades</th>
              <th className="p-3">Scores</th>
              <th className="p-3">Wallets</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="p-3">
                  <div className="font-medium">{u.displayName || "—"}</div>
                  <div className="text-slate-500">{u.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {!u.emailVerified && <span className="badge bg-amber-100 text-amber-800">unverified</span>}
                    {u.role === "ADMIN" && <span className="badge bg-slate-800 text-white">admin</span>}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`badge ${statusBadge(u.accountStatus || "ACTIVE")}`}>
                    {u.accountStatus || "ACTIVE"}
                  </span>
                  {u.suspendedUntil && (
                    <div className="mt-1 text-xs text-slate-500">until {date(u.suspendedUntil)}</div>
                  )}
                </td>
                <td className="whitespace-nowrap p-3 text-xs text-slate-600">
                  {u.lastLoginAt ? date(u.lastLoginAt) : <span className="text-slate-400">Never</span>}
                </td>
                <td className="p-3 text-xs">
                  <div>
                    {u.activeTrades ?? 0} / {u.tradeLimit ?? "—"} active
                  </div>
                  <div className="text-slate-500">bad: {u.badScore}</div>
                </td>
                <td className="p-3">
                  <span className="font-semibold text-emerald-600">+{u.goodScore}</span>{" "}
                  <span className="font-semibold text-red-600">-{u.badScore}</span>
                </td>
                <td className="p-3 text-xs">
                  <div>{money(u.balanceUsdt, "USDT")}</div>
                  <div>{money(u.balanceNgn, "NGN")}</div>
                  <div>{money(u.balanceGhs, "GHS")}</div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/users/${u.id}`} className="btn-ghost text-brand-700">
                      Manage
                    </Link>
                    {u.role !== "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => void deleteUser(u.id)}
                        disabled={deletingUserId === u.id}
                        className="rounded bg-red-100 px-3 py-1.5 text-sm text-red-800 disabled:opacity-60"
                        title="Permanently delete this non-admin user"
                      >
                        {deletingUserId === u.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-6 text-sm text-slate-400">
            {q.trim() ? "No users match your search." : "No users found."}
          </p>
        )}
      </div>
    </div>
  );
}
