"use client";

import { useEffect, useId, useState } from "react";
import { useT } from "@/lib/i18n";

interface Tier {
  label: string;
  text: string;
  from: string;
  to: string;
}

function tierFor(pct: number): Tier {
  if (pct >= 95) return { label: "Excellent", text: "text-emerald-600", from: "#14b8a6", to: "#10b981" };
  if (pct >= 80) return { label: "Great", text: "text-brand-600", from: "#14b8a6", to: "#0d9488" };
  if (pct >= 60) return { label: "Fair", text: "text-amber-600", from: "#f59e0b", to: "#fbbf24" };
  return { label: "Needs work", text: "text-red-600", from: "#f43f5e", to: "#fb7185" };
}

/**
 * Circular gauge showing the user's trade completion guarantee:
 * completed (paid) trades ÷ (completed + rejected) trades.
 */
export function TradeCompletionGauge({ completed, rejected }: { completed: number; rejected: number }) {
  const t = useT();
  const gradientId = useId();
  const total = completed + rejected;
  const pct = total > 0 ? Math.round((completed / total) * 100) : null;
  const tier = pct == null ? null : tierFor(pct);

  const R = 52;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(pct ?? 0));
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  const offset = CIRCUMFERENCE * (1 - shown / 100);

  return (
    <div className="card overflow-hidden bg-gradient-to-br from-brand-50/70 via-white to-white p-4 sm:p-6">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={tier?.from ?? "#cbd5e1"} />
                <stop offset="100%" stopColor={tier?.to ?? "#cbd5e1"} />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="12" className="stroke-slate-100" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              stroke={`url(#${gradientId})`}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-extrabold leading-none sm:text-3xl ${tier?.text ?? "text-slate-400"}`}>
              {pct == null ? "—" : `${pct}%`}
            </span>
            {tier && (
              <span className={`mt-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${tier.text}`}>
                {t(tier.label)}
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-700 sm:text-base">
            {t("Trade completion guarantee")}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t("{count} completed", { count: completed })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {t("{count} rejected", { count: rejected })}
            </span>
          </div>
          <p className="mt-2 text-xs leading-snug text-slate-500 sm:text-sm">
            {total === 0
              ? t("Complete your first gift card trade to build your score.")
              : t("Share of your finished gift card trades that were paid out successfully.")}
          </p>
        </div>
      </div>
    </div>
  );
}
