"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { date } from "@/lib/format";

export function TradeChat({ tradeId, myUserId }: { tradeId: string; myUserId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const d = await api(`/trades/${tradeId}`);
    setMessages(d.messages || []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [tradeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api(`/trades/${tradeId}/messages`, { body: { body } });
      setBody("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col p-4">
      <h3 className="mb-3 font-bold">Trade chat</h3>
      <div className="mb-3 max-h-80 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.sender.id === myUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-800"}`}>
                <div className="text-[11px] opacity-70">
                  {m.sender.role === "ADMIN" ? "Support" : m.sender.displayName || "You"} · {date(m.createdAt)}
                </div>
                <div>{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input className="input" placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn-primary" disabled={busy}>Send</button>
      </form>
    </div>
  );
}
