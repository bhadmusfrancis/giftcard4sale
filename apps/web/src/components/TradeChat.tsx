"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";

type ChatMessage = {
  id: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentFilename?: string | null;
  attachmentMimeType?: string | null;
  createdAt: string;
  sender: { id: string; displayName?: string; role: string };
};

export function TradeChat({
  tradeId,
  myUserId,
  isAdmin = false,
}: {
  tradeId: string;
  myUserId: string;
  isAdmin?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const sendAction = useAsyncAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const chatClosed = !isAdmin && (tradeStatus === "REJECTED" || tradeStatus === "CANCELLED");

  async function load() {
    const d = await api(`/trades/${tradeId}`);
    setMessages(d.messages || []);
    setTradeStatus(d.trade?.status ?? null);
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
    if (chatClosed) return;
    if (!body.trim() && !file) return;
    await sendAction.run(async () => {
      const form = new FormData();
      if (body.trim()) form.append("body", body.trim());
      if (file) form.append("file", file);
      await api(`/trades/${tradeId}/messages`, { body: form, isForm: true });
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    }, "Message sent.");
  }

  return (
    <div className="card flex flex-col p-4">
      <h3 className="mb-3 font-bold">Trade chat</h3>
      {chatClosed && (
        <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          This trade was rejected. Chat is closed — contact support if you need help.
        </p>
      )}
      <div className="mb-3 max-h-80 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.sender.id === myUserId;
          const isImage = m.attachmentMimeType?.startsWith("image/");
          const isPdf = m.attachmentMimeType === "application/pdf";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <div className="text-[11px] opacity-70">
                  {m.sender.role === "ADMIN" ? "Support" : m.sender.displayName || "You"} · {date(m.createdAt)}
                </div>
                {m.body ? <div className="whitespace-pre-wrap">{m.body}</div> : null}
                {m.attachmentUrl && isImage && (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.attachmentUrl}
                      alt={m.attachmentFilename || "Attachment"}
                      className="max-h-48 rounded-lg border border-white/20 object-contain"
                    />
                  </a>
                )}
                {m.attachmentUrl && isPdf && (
                  <a
                    href={m.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-2 inline-flex items-center gap-1 text-sm underline ${mine ? "text-white" : "text-brand-700"}`}
                  >
                    📄 {m.attachmentFilename || "PDF attachment"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {!chatClosed && (
        <form onSubmit={send} className="space-y-2">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Type a message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={sendAction.busy || (!body.trim() && !file)}>
              {sendAction.busy ? "Sending…" : "Send"}
            </button>
          </div>
          <FormFeedback status={sendAction.status} anchorRef={sendAction.statusRef} />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="text-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <span className="truncate">{file.name}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
