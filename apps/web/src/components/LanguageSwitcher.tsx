"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LANGUAGE_OPTIONS } from "@/lib/locale";

const DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  LANGUAGE_OPTIONS.map((l) => [l.tag, l.label])
);

function labelFor(tag: string): string {
  if (DISPLAY_NAMES[tag]) return DISPLAY_NAMES[tag];
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "language" });
    return dn.of(tag) || tag;
  } catch {
    return tag;
  }
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, ready, t, translationError, retryTranslations } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const shown = ready ? lang : "en";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700"
        aria-label={t("Language")}
        title={t("Language")}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 010 18M12 3a15.3 15.3 0 000 18" strokeLinecap="round" />
        </svg>
        <span className={`${compact ? "max-w-[3.5rem]" : "max-w-[7rem]"} truncate text-xs font-semibold uppercase`}>{shown}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.tag}
              type="button"
              aria-pressed={shown === opt.tag}
              onClick={() => {
                setLang(opt.tag);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                shown === opt.tag ? "font-semibold text-brand-700" : "text-slate-700"
              }`}
            >
              <span>{opt.label}</span>
              {shown === opt.tag && <span aria-hidden>✓</span>}
            </button>
          ))}
          {shown !== "en" && !DISPLAY_NAMES[shown] && (
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
              {t("Detected")}: {labelFor(shown)}
            </div>
          )}
        </div>
      )}
      {translationError && !open && (
        <div role="status" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-700 shadow-lg">
          <p>{t("Some content could not be loaded in your selected language.")}</p>
          <button type="button" className="mt-2 font-semibold text-brand-700 underline" onClick={retryTranslations}>
            {t("Retry")}
          </button>
        </div>
      )}
    </div>
  );
}
