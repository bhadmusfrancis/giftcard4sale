"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGE_OPTIONS, isSeoLocale, localizedPath } from "@/lib/locale";

/**
 * Crawlable language switcher for indexable pages — plain <Link> hrefs so
 * search engines can discover every locale variant (unlike the navbar's
 * cookie-based LanguageSwitcher). Strips an existing /{lang} prefix from the
 * current URL to derive the shared path, then links each locale's version.
 */
export function SeoLanguageLinks({ current }: { current?: string }) {
  const pathname = usePathname() || "/";
  const seg = pathname.split("/")[1]?.toLowerCase() ?? "";
  const active = current ?? (isSeoLocale(seg) ? seg : "en");
  const base = isSeoLocale(seg) ? pathname.slice(seg.length + 1) || "/" : pathname;

  return (
    <nav aria-label="Language versions" data-i18n-skip className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 text-xs">
        <span className="font-semibold text-slate-500">Languages:</span>
        <Link
          href={base}
          lang="en"
          hrefLang="en"
          className={active === "en" ? "font-bold text-brand-700" : "text-slate-600 hover:text-brand-700"}
        >
          English
        </Link>
        {LANGUAGE_OPTIONS.filter((o) => o.tag !== "en").map((o) => (
          <Link
            key={o.tag}
            href={localizedPath(o.tag, base)}
            lang={o.tag}
            hrefLang={o.tag}
            className={active === o.tag ? "font-bold text-brand-700" : "text-slate-600 hover:text-brand-700"}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
