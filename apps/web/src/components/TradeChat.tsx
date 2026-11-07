"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";

type ChatMessage = {
  id: string;
  body: string;
  // Admin-only: set when the shown body was machine-translated (original +
  // detected source language). Users never see this.
  originalBody?: string;
  bodyLang?: string | null;
  attachmentUrl?: string | null;
  attachmentFilename?: string | null;
  attachmentMimeType?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; displayName?: string; role: string };
};

const NEAR_BOTTOM_PX = 80;
const MAX_FILES = 10;
const COMPOSER_MAX_PX = 128;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string, t: (s: string) => string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return t("Today");
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return t("Yesterday");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function TradeChat({
  tradeId,
  myUserId,
  isAdmin = false,
  className = "h-[32rem]",
}: {
  tradeId: string;
  myUserId: string;
  isAdmin?: boolean;
  /** Sizing for the panel — the chat fills this height and scrolls internally. */
  className?: string;
}) {
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  // Watermarks: how far the partner has delivered/read MY messages.
  const [receipts, setReceipts] = useState<{ readAt?: string | null; deliveredAt?: string | null }>({});
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const sendAction = useAsyncAction({ scrollOnStatus: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const firstLoadRef = useRef(true);
  const typingSentAtRef = useRef(0);
  const typingActiveRef = useRef(false);
  const coarsePointerRef = useRef<boolean | null>(null);

  const chatClosed = !isAdmin && (tradeStatus === "REJECTED" || tradeStatus === "CANCELLED");
  const partnerLabel = isAdmin ? t("Seller") : t("Support");

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
    // Instant, not smooth: a smooth scroll still animating when an image loads
    // fires scroll events that look like the user scrolled up, unpinning the chat.
    if (stickToBottomRef.current || (last && last.sender.id === myUserId)) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, partnerTyping]);

  // Panels hidden behind a mobile tab mount at zero height; jump to the latest
  // message once they become visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastHeight = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (lastHeight === 0 && el.clientHeight > 0) el.scrollTop = el.scrollHeight;
      lastHeight = el.clientHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  function resizeComposer() {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }

  async function submitMessage() {
    if (chatClosed || sendAction.busy) return;
    if (!body.trim() && !files.length) return;
    stopTyping();
    await sendAction.run(async () => {
      const form = new FormData();
      if (body.trim()) form.append("body", body.trim());
      files.forEach((f) => form.append("files", f));
      await api(`/trades/${tradeId}/messages`, { body: form, isForm: true });
      setBody("");
      setFiles([]);
      requestAnimationFrame(resizeComposer);
      stickToBottomRef.current = true;
      await load();
    });
  }

  function addFiles(list: FileList | null) {
    // Copy before clearing the input: its FileList is live and empties when
    // the value is reset, and the state updater only runs on the next render.
    const picked = list ? Array.from(list) : [];
    if (fileRef.current) fileRef.current.value = "";
    if (picked.length) setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function receiptLabel(m: ChatMessage): { text: string; read: boolean } {
    const read = !!m.readAt || (!!receipts.readAt && m.createdAt <= receipts.readAt);
    if (read) return { text: "✓✓", read: true };
    const delivered = !!m.deliveredAt || (!!receipts.deliveredAt && m.createdAt <= receipts.deliveredAt);
    if (delivered) return { text: "✓✓", read: false };
    return { text: "✓", read: false };
  }

  const canSend = !sendAction.busy && (!!body.trim() || files.length > 0);

  return (
    <div className={`card flex min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
          {partnerLabel[0]}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-900">{isAdmin ? t("Chat with seller") : t("Support chat")}</h3>
          <p className="truncate text-xs text-slate-500">
            {partnerTyping ? (
              <span className="text-brand-700">{t("{who} is typing…", { who: partnerLabel })}</span>
            ) : isAdmin ? (
              t("Replies notify the seller by email.")
            ) : (
              t("Ask support anything about this trade.")
            )}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-slate-50/70 px-3 py-4 sm:px-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium text-slate-600">{t("No messages yet")}</p>
            <p className="text-xs text-slate-400">
              {chatClosed
                ? t("This chat is closed.")
                : t("Send a message to {who} below.", { who: partnerLabel.toLowerCase() })}
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender.id === myUserId;
          const isImage = m.attachmentMimeType?.startsWith("image/");
          const isPdf = m.attachmentMimeType === "application/pdf";
          const receipt = mine ? receiptLabel(m) : null;
          const prev = messages[i - 1];
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
          const sameSenderAsPrev = !newDay && prev?.sender.id === m.sender.id;
          const senderName = m.sender.role === "ADMIN" ? t("Support") : m.sender.displayName || t("Seller");
          return (
            <Fragment key={m.id}>
              {newDay && (
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-white px-3 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                    {dayLabel(m.createdAt, t)}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"} ${sameSenderAsPrev ? "!mt-0.5" : ""}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[75%] ${
                    mine
                      ? "rounded-br-md bg-brand-700 text-white"
                      : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200"
                  }`}
                >
                  {!mine && !sameSenderAsPrev && (
                    <div className="mb-0.5 text-[11px] font-semibold text-brand-700">{senderName}</div>
                  )}
                  {m.body ? <div className="whitespace-pre-wrap break-words">{m.body}</div> : null}
                  {isAdmin && m.originalBody && (
                    <div className="mt-1 text-[10px] italic text-slate-400" title={m.originalBody}>
                      {t("auto-translated")}
                      {m.bodyLang ? ` · ${m.bodyLang}` : ""}
                    </div>
                  )}
                  {m.attachmentUrl && isImage && (
                    <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1.5 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.attachmentUrl}
                        alt={m.attachmentFilename || "Attachment"}
                        onLoad={() => {
                          const el = scrollRef.current;
                          if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
                        }}
                        className="max-h-60 w-auto max-w-full rounded-lg object-contain"
                      />
                    </a>
                  )}
                  {m.attachmentUrl && isPdf && (
                    <a
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-1.5 flex max-w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
                        mine ? "bg-white/15 text-white" : "bg-slate-100 text-brand-800"
                      }`}
                    >
                      <span aria-hidden>📄</span>
                      <span className="truncate">{m.attachmentFilename || t("PDF attachment")}</span>
                    </a>
                  )}
                  <div
                    className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                      mine ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    <span>{timeLabel(m.createdAt)}</span>
                    {receipt && (
                      <span className={receipt.read ? "text-sky-200" : ""} title={receipt.read ? t("Read") : t("Sent")}>
                        {receipt.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        )}
      </div>

      {chatClosed ? (
        <p className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
          {t("This trade was {status}, so the chat is closed. Contact support if you need help.", {
            status: tradeStatus === "CANCELLED" ? t("cancelled") : t("rejected"),
          })}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitMessage();
          }}
          className="shrink-0 border-t border-slate-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-3"
        >
          {files.length > 0 && (
            <ul className="scrollbar-none mb-2 flex gap-2 overflow-x-auto px-1">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}-${i}`}
                  className="flex max-w-[12rem] shrink-0 items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs text-slate-700"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-red-600"
                    aria-label={t("Remove {name}", { name: f.name })}
                  >
                    ×
                  </button>
                </li>
              ))}
              <li className="shrink-0 self-center text-[11px] text-slate-400">
                {files.length}/{MAX_FILES}
              </li>
            </ul>
          )}
          <div className="flex items-end gap-1.5 sm:gap-2">
            <label
              className={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 ${
                files.length >= MAX_FILES ? "pointer-events-none opacity-40" : ""
              }`}
              title={t("Attach images or PDF")}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                />
              </svg>
              <span className="sr-only">{t("Attach files")}</span>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                disabled={files.length >= MAX_FILES}
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            <textarea
              ref={textRef}
              rows={1}
              className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm leading-6 outline-none focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
              placeholder={isAdmin ? t("Message the seller…") : t("Type a message…")}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                resizeComposer();
                emitTyping();
              }}
              onBlur={stopTyping}
              onKeyDown={(e) => {
                // Enter sends on keyboards; on touch screens Enter inserts a newline.
                const touch =
                  coarsePointerRef.current ??
                  (coarsePointerRef.current = window.matchMedia("(pointer: coarse)").matches);
                if (e.key === "Enter" && !e.shiftKey && !touch) {
                  e.preventDefault();
                  void submitMessage();
                }
              }}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-white shadow-sm transition hover:bg-brand-800 disabled:bg-slate-300 sm:w-auto sm:px-4"
              aria-label={t("Send message")}
            >
              {sendAction.busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="currentColor" aria-hidden>
                    <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                  </svg>
                  <span className="hidden text-sm font-semibold sm:inline">{t("Send")}</span>
                </>
              )}
            </button>
          </div>
          {sendAction.status && !sendAction.status.ok && (
            <FormFeedback status={sendAction.status} anchorRef={sendAction.statusRef} className="mt-2" />
          )}
        </form>
      )}
    </div>
  );
}
