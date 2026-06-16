"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "USER" });

  async function load() {
    const d = await api(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setUsers(d.users);
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    await api("/admin/users", { body: form });
    setShowCreate(false);
    setForm({ email: "", password: "", displayName: "", role: "USER" });
    load();
  }

  async function score(id: string, kind: "good" | "bad") {
    await api(`/admin/users/${id}/score`, { body: { kind, delta: 1 } });
    load();
  }

  async function adjust(id: string) {
    const currency = prompt("Currency (USDT/NGN/GHS)", "NGN");
    if (!currency) return;
    const amount = Number(prompt("Amount (negative to debit)", "0"));
    if (!amount) return;
    const description = prompt("Description", "Admin adjustment") || undefined;
    await api(`/admin/users/${id}/adjust-balance`, { body: { currency, amount, description } });
    load();
  }

  async function setRole(id: string, role: string) {
    await api(`/admin/users/${id}`, { method: "PATCH", body: { role } });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Users</h2>
        <button onClick={() => setShowCreate((s) => !s)} className="btn-primary">New user</button>
      </div>

      {showCreate && (
        <form onSubmit={createUser} className="card grid gap-3 p-6 sm:grid-cols-2">
          <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input className="input" placeholder="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="btn-primary sm:col-span-2">Create</button>
        </form>
      )}

      <div className="flex gap-2">
        <input className="input" placeholder="Search by email or name" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={load} className="btn-ghost">Search</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Scores</th>
              <th className="p-3">Wallets</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <div className="font-medium">{u.displayName || "—"}</div>
                  <div className="text-slate-500">{u.email}</div>
                  {!u.emailVerified && <span className="badge bg-amber-100 text-amber-800">unverified</span>}
                </td>
                <td className="p-3">
                  <span className="text-emerald-600 font-semibold">+{u.goodScore}</span>{" "}
                  <span className="text-red-600 font-semibold">-{u.badScore}</span>
                </td>
                <td className="p-3 text-xs">
                  <div>{money(u.balanceUsdt, "USDT")}</div>
                  <div>{money(u.balanceNgn, "NGN")}</div>
                  <div>{money(u.balanceGhs, "GHS")}</div>
                </td>
                <td className="p-3">
                  <select className="rounded border border-slate-300 px-2 py-1" value={u.role} onChange={(e) => setRole(u.id, e.target.value)}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => score(u.id, "good")} className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">+Good</button>
                    <button onClick={() => score(u.id, "bad")} className="rounded bg-red-100 px-2 py-1 text-red-700">+Bad</button>
                    <button onClick={() => adjust(u.id)} className="rounded bg-slate-100 px-2 py-1">Adjust</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
