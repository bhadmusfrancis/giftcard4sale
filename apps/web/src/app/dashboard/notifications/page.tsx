"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { date } from "@/lib/format";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const d = await api("/notifications");
    setItems(d.notifications);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await api("/notifications/read", { body: {} });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={markAll} className="btn-ghost">Mark all read</button>
      </div>

      <div className="card divide-y divide-slate-100">
        {items.map((n) => (
          <div key={n.id} className={`p-4 ${n.read ? "" : "bg-brand-50/40"}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{n.title}</div>
              <span className="text-xs text-slate-400">{date(n.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{n.body}</p>
            {n.link && <Link href={n.link} className="mt-1 inline-block text-sm text-brand-700 hover:underline">View →</Link>}
          </div>
        ))}
        {items.length === 0 && <p className="p-6 text-sm text-slate-400">No notifications yet.</p>}
      </div>
    </div>
  );
}
