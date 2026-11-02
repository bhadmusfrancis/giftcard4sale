"use client";

import Link from "next/link";
import { ReactNode, useRef } from "react";
import { money, date, STATUS_COLORS } from "@/lib/format";

/** One trade in a list: title + status on top, amounts and meta below. Same layout on every screen size. */
export function TradeListItem({
  trade: t,
  href,
  seller,
  statusTitle,
  extraBadge,
}: {
  trade: any;
  href: string;
  seller?: string;
  statusTitle?: string;
  extraBadge?: ReactNode;
}) {
  const country = t.otherCountryName ? `${t.otherCountryName} (${t.country})` : t.country;
  return (
    <Link href={href} className="block px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-100 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900">{t.cardType?.name}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {country} · {t.medium}
            {seller ? <> · {seller}</> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`badge ${STATUS_COLORS[t.status]}`} title={statusTitle}>
            {t.status.replace("_", " ")}
          </span>
          {extraBadge}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-sm">
          <span className="text-slate-600">
            {t.cardAmount} {t.currency}
          </span>
          <span className="mx-1.5 text-slate-300">→</span>
          <span className="font-semibold text-slate-900">{money(t.finalPayout ?? t.quotedPayout, t.payoutCurrency)}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-400 sm:text-xs">
          <span className="truncate font-mono">{t.tradeNumber}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{date(t.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export type TabItem<T extends string> = { id: T; label: string; badge?: ReactNode };

/** Segmented control used to switch panels on phones (hidden from `hideFrom` breakpoint up). */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "lg:hidden",
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Bring the newly selected panel to the top of the screen, just under the sticky tab bar.
  function select(id: T) {
    onChange(id);
    const anchor = anchorRef.current;
    const bar = barRef.current;
    if (!anchor || !bar) return;
    const stickyTop = parseFloat(getComputedStyle(bar).top) || 0;
    const top = anchor.getBoundingClientRect().top + window.scrollY - stickyTop;
    requestAnimationFrame(() => window.scrollTo({ top: Math.max(0, top), behavior: "smooth" }));
  }

  return (
    <>
      <div ref={anchorRef} className={`-mb-4 h-0 sm:-mb-5 ${className}`} aria-hidden />
      <div
        ref={barRef}
        role="tablist"
        className={`sticky top-[6.85rem] z-20 grid gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur md:top-20 ${className}`}
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(t.id)}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition ${
              active ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="truncate">{t.label}</span>
            {t.badge}
          </button>
        );
      })}
      </div>
    </>
  );
}

/** Label / value row that wraps long values (emails, IDs) instead of overflowing. */
export function DetailRow({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 text-sm last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={`min-w-0 break-words font-medium text-slate-900 sm:text-right ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

/** Code block for e-codes / PINs with a copy button. */
export function CodeBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button
          type="button"
          className="btn-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
          onClick={() => void navigator.clipboard?.writeText(text)}
        >
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-sm">{text}</pre>
    </div>
  );
}

/** Responsive thumbnail grid for trade attachments. */
export function AttachmentGrid({ items }: { items: Array<{ id: string; url: string; filename?: string }> }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="block aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.filename || "Attachment"} className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
