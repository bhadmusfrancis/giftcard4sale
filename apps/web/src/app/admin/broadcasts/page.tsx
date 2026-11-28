"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";

const PRESETS = [
  {
    name: "New cards & rates",
    title: "New gift cards just landed 🎁",
    body: "A fresh collection of tradeable gift cards is live with some of our best rates yet — top payouts on the brands everyone wants. Browse the new arrivals and lock in today's rate before it moves!",
    link: "/cards",
  },
  {
    name: "Rate boost",
    title: "Rates are up right now 📈",
    body: "We're paying above-market rates on top gift card brands for a limited time. Check the calculator and cash in while payouts are hot!",
    link: "/rates",
  },
] as const;

export default function AdminBroadcastsPage() {
  const [audience, setAudience] = useState<number | null>(null);
  const [title, setTitle] = useState<string>(PRESETS[0].title);
  const [body, setBody] = useState<string>(PRESETS[0].body);
  const [link, setLink] = useState<string>(PRESETS[0].link);
  const [sendEmail, setSendEmail] = useState(false);
  const sendAction = useAsyncAction();
  const [sentTo, setSentTo] = useState<number | null>(null);

  useEffect(() => {
    api<{ activeUsers: number }>("/admin/broadcasts/audience")
      .then((d) => setAudience(d.activeUsers))
      .catch(() => setAudience(null));
  }, []);

  function applyPreset(p: (typeof PRESETS)[number]) {
    setTitle(p.title);
    setBody(p.body);
    setLink(p.link);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send this broadcast to ${audience ?? "…"} active user(s)?`)) return;
    await sendAction.run(async () => {
      const d = await api<{ recipients: number }>("/admin/broadcasts", {
        body: { title, body, link: link || undefined, sendEmail },
      });
      setSentTo(d.recipients);
    }, "Broadcast sent.");
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="page-title">Broadcasts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Send a group announcement to every active user — verified email, not suspended or banned.
          Delivered in-app and by push; email only reaches users who opted in.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* Composer */}
        <form onSubmit={send} className="card space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900">Compose</h3>
            <span className="badge bg-brand-50 text-brand-800">
              {audience == null ? "…" : `${audience} active user${audience === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className="chip-off"
              >
                {p.name}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
            <p className="mt-1 text-right text-xs text-slate-400">{title.length}/120</p>
          </div>

          <div>
            <label className="label">Message</label>
            <textarea
              className="input min-h-28"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              required
            />
            <p className="mt-1 text-right text-xs text-slate-400">{body.length}/500</p>
          </div>

          <div>
            <label className="label">Link (optional)</label>
            <input
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/cards"
              pattern="\/[^ ]*"
            />
            <p className="mt-1 text-xs text-slate-400">
              Internal path only, e.g. <code>/cards</code> or <code>/rates</code>.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Also send email (only to users who opted in to broadcast emails)
          </label>

          <FormFeedback status={sendAction.status} anchorRef={sendAction.statusRef} />
          {sentTo != null && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              Delivered to {sentTo} active user{sentTo === 1 ? "" : "s"}.
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={sendAction.busy}>
            {sendAction.busy ? "Sending…" : `Send to ${audience ?? "…"} active users`}
          </button>
        </form>

        {/* Live preview */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Preview</h3>

          {/* Push-style preview */}
          <div className="rounded-3xl bg-slate-900 p-3 shadow-lg sm:p-4">
            <div className="rounded-2xl bg-white/95 p-3.5 shadow-xl backdrop-blur sm:p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-lg font-extrabold text-white">
                  G
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold text-slate-900">
                      {title || "Notification title"}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">now</span>
                  </div>
                  <p className="mt-0.5 line-clamp-3 text-[13px] leading-snug text-slate-600">
                    {body || "Your message will appear here…"}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Push notification
            </p>
          </div>

          {/* In-app preview */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">{title || "Notification title"}</div>
              <span className="text-xs text-slate-400">now</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{body || "Your message will appear here…"}</p>
            {link && (
              <span className="mt-1 inline-block text-sm font-medium text-brand-700">View →</span>
            )}
            <p className="mt-3 border-t border-slate-100 pt-2 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
              In-app notification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
