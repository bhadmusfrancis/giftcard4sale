"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { money, date, STATUS_COLORS } from "@/lib/format";

const STATUSES = ["", "PENDING", "PROCESSING", "APPROVED", "REJECTED", "PAID"];

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
    <div className="space-y-5 sm:space-y-6">
      <h2 className="text-xl font-bold sm:text-2xl">Withdrawals</h2>
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
              <div className="mt-0.5 text-xs text-slate-400">{date(w.createdAt)}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${STATUS_COLORS[w.status]}`}>{w.status}</span>
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
