"use client";

import { useT } from "@/lib/i18n";

export function HomeSearchForm() {
  const t = useT();
  return (
    <form action="/cards" method="get" className="mx-auto mt-8 flex max-w-lg gap-2">
      <input
        name="q"
        type="search"
        className="input flex-1 border-white/20 bg-white/95 text-slate-900 placeholder:text-slate-500"
        placeholder={t("Search gift cards (Amazon, Steam, iTunes…)")}
        aria-label={t("Search gift cards")}
      />
      <button type="submit" className="btn shrink-0 bg-white text-brand-800 hover:bg-brand-50">
        {t("Search")}
      </button>
    </form>
  );
}
