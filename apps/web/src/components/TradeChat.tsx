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
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; displayName?: string; role: string };
};

const NEAR_BOTTOM_PX = 80;

export function TradeChat({
  tradeId,
  myUserId,
  isAdmin = false,
  layout = "default",
}: {
  tradeId: string;
  myUserId: string;
  isAdmin?: boolean;
  /** "panel" fills available height — use on admin trade detail. */
  layout?: "default" | "panel";
}) {
  const isPanel = layout === "panel";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  // Watermarks: how far the partner has delivered/read MY messages.
  const [receipts, setReceipts] = useState<{ readAt?: string | null; deliveredAt?: string | null }>({});
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const sendAction = useAsyncAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const firstLoadRef = useRef(true);
  const typingSentAtRef = useRef(0);
  const typingActiveRef = useRef(false);

  const chatClosed = !isAdmin && (tradeStatus === "REJECTED" || tradeStatus === "CANCELLED");
  const partnerLabel = isAdmin ? "Seller" : "Support";

  async function load() {
    const d = await api(`/trades/${tradeId}`);
    setMessages(d.messages || []);
    setTradeStatus(d.trade?.status ?? null);
    if (typeof d.partnerTyping === "boolean") setPartnerTyping(d.partnerTyping);
  }

  useEffect(() => {
    firstLoadRef.current = true;
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [tradeId]);

  // While the chat is visible, mark partner messages read and refresh
  // typing + receipt watermarks. Hidden tabs skip this so "read" is honest.
  useEffect(() => {
    async function syncRead() {
      if (document.visibilityState !== "visible") return;
      try {
        const d = await api(`/trades/${tradeId}/messages/read`, { method: "POST" });
        setPartnerTyping(!!d.partnerTyping);
        setReceipts({ readAt: d.partnerReadAt ?? null, deliveredAt: d.partnerDeliveredAt ?? null });
      } catch {
        // best-effort; next poll retries
      }
    }
    syncRead();
    const t = setInterval(syncRead, 3000);
    document.addEventListener("visibilitychange", syncRead);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", syncRead);
    };
  }, [tradeId]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  // Only auto-scroll when the user is already near the bottom (or just sent a
  // message themselves). Scrolling up to read history is no longer hijacked
  // by the polling refresh. We scroll only the chat container itself —
  // scrollIntoView would also scroll the whole page and yank the user to the
  // chat input when they're reading the top of the trade page.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }
    const last = messages[messages.length - 1];
    if (stickToBottomRef.current || (last && last.sender.id === myUserId)) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, partnerTyping]);

  function emitTyping() {
    const now = Date.now();
    if (now - typingSentAtRef.current < 2000) return;
    typingSentAtRef.current = now;
    typingActiveRef.current = true;
    void api(`/trades/${tradeId}/typing`, { method: "POST", body: { typing: true } }).catch(() => {});
  }

  function stopTyping() {
    if (!typingActiveRef.current) return;
    typingActiveRef.current = false;
    void api(`/trades/${tradeId}/typing`, { method: "POST", body: { typing: false } }).catch(() => {});
  }

  async function submitMessage() {
    if (chatClosed) return;
    if (!body.trim() && !file) return;
    stopTyping();
    await sendAction.run(async () => {
      const form = new FormData();
      if (body.trim()) form.append("body", body.trim());
      if (file) form.append("file", file);
      await api(`/trades/${tradeId}/messages`, { body: form, isForm: true });
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      stickToBottomRef.current = true;
      await load();
    }, "Message sent.");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    await submitMessage();
  }

  function receiptLabel(m: ChatMessage): { text: string; read: boolean } {
    const read = !!m.readAt || (!!receipts.readAt && m.createdAt <= receipts.readAt);
    if (read) return { text: "✓✓ Read", read: true };
    const delivered = !!m.deliveredAt || (!!receipts.deliveredAt && m.createdAt <= receipts.deliveredAt);
    if (delivered) return { text: "✓✓ Delivered", read: false };
    return { text: "✓ Sent", read: false };
  }

  return (
    <div
      className={`card flex flex-col overflow-hidden ${
        isPanel ? "h-full min-h-0" : "p-4"
      }`}
    >
      <div className={`shrink-0 ${isPanel ? "border-b border-slate-200 px-5 py-4" : "mb-3"}`}>
        <h3 className="font-bold">Trade chat</h3>
        {isPanel && (
          <p className="mt-0.5 text-sm text-slate-500">
            {isAdmin ? "Reply to the seller — messages notify them by email." : "Chat with support about this trade."}
          </p>
        )}
      </div>

      {chatClosed && (
        <p
          className={`shrink-0 text-sm text-slate-600 ${
            isPanel ? "mx-5 mt-4 rounded-lg bg-slate-100 px-3 py-2" : "mb-3 rounded-lg bg-slate-100 px-3 py-2"
          }`}
        >
          This trade was rejected. Chat is closed — contact support if you need help.
        </p>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={`space-y-3 overflow-y-auto ${
          isPanel
            ? "min-h-0 flex-1 px-5 py-4"
            : "mb-3 max-h-80 flex-1 md:max-h-96"
        }`}
      >
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            {isPanel ? "No messages yet. Start the conversation below." : "No messages yet."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender.id === myUserId;
          const isImage = m.attachmentMimeType?.startsWith("image/");
          const isPdf = m.attachmentMimeType === "application/pdf";
          const receipt = mine ? receiptLabel(m) : null;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[min(100%,28rem)] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <div className="text-[11px] opacity-70">
                  {m.sender.role === "ADMIN" ? "Support" : m.sender.displayName || "You"} · {date(m.createdAt)}
                </div>
                {m.body ? <div className="mt-1 whitespace-pre-wrap break-words">{m.body}</div> : null}
                {m.attachmentUrl && isImage && (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.attachmentUrl}
                      alt={m.attachmentFilename || "Attachment"}
                      className={`rounded-lg border border-white/20 object-contain ${
                        isPanel ? "max-h-64 xl:max-h-80" : "max-h-48"
                      }`}
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
                {receipt && (
                  <div className={`mt-1 text-right text-[10px] ${receipt.read ? "text-sky-200" : "text-white/60"}`}>
                    {receipt.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-xs italic text-slate-500">
              {partnerLabel} is typing…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!chatClosed && (
        <form
          onSubmit={send}
          className={`shrink-0 space-y-2 ${isPanel ? "border-t border-slate-200 bg-slate-50/80 px-5 py-4" : ""}`}
        >
          {isPanel ? (
            <>
              <textarea
                className="input min-h-[4.5rem] resize-y"
                rows={2}
                placeholder={isAdmin ? "Type a message to the seller…" : "Type a message…"}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  emitTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitMessage();
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-500">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="max-w-full text-xs"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file && <span className="truncate">{file.name}</span>}
                </div>
                <button
                  type="submit"
                  className="btn-primary shrink-0"
                  disabled={sendAction.busy || (!body.trim() && !file)}
                >
                  {sendAction.busy ? "Sending…" : "Send message"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Type a message…"
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    emitTyping();
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary shrink-0"
                  disabled={sendAction.busy || (!body.trim() && !file)}
                >
                  {sendAction.busy ? "Sending…" : "Send"}
                </button>
              </div>
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
            </>
          )}
          <FormFeedback status={sendAction.status} anchorRef={sendAction.statusRef} />
        </form>
      )}
    </div>
  );
}
