"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { money, date, STATUS_COLORS } from "@/lib/format";

const STATUSES = ["", "PENDING", "PROCESSING", "APPROVED", "REJECTED", "PAID"];

function WithdrawalsInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "PENDING");
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const d = await api(`/admin/withdrawals${status ? `?status=${status}` : ""}`);
    setItems(d.withdrawals);
  }

  useEffect(() => {
    load();
  }, [status]);

  async function act(id: string, newStatus: string) {
    const adminNote = newStatus === "REJECTED" ? prompt("Reason for rejection (refunds the user)") || "" : undefined;
    await api(`/admin/withdrawals/${id}`, { method: "PATCH", body: { status: newStatus, adminNote } });
    load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Withdrawals</h2>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s || "ALL"} onClick={() => setStatus(s)} className={`badge ${status === s ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}>
            {s || "ALL"}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-slate-100">
        {items.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold">{money(w.amount, w.currency)} · {w.user?.displayName || w.user?.email}</div>
              <div className="text-sm text-slate-500">
                {w.bankAccount ? `${w.bankAccount.bankName} ${w.bankAccount.accountNumber} (${w.bankAccount.accountName})` : w.destinationAddress} · {date(w.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${STATUS_COLORS[w.status]}`}>{w.status}</span>
              {["PENDING", "PROCESSING"].includes(w.status) && (
                <>
                  <button onClick={() => act(w.id, "PROCESSING")} className="rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs">Processing</button>
                  <button onClick={() => act(w.id, "PAID")} className="rounded bg-green-100 px-2 py-1 text-green-700 text-xs">Mark paid</button>
                  <button onClick={() => act(w.id, "REJECTED")} className="rounded bg-red-100 px-2 py-1 text-red-700 text-xs">Reject</button>
                </>
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
