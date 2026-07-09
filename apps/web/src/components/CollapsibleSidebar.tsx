"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export type SidebarNavItem = { href: string; label: string };

function isNavActive(pathname: string, href: string, rootHref: string) {
  return pathname === href || (href !== rootHref && pathname.startsWith(href));
}

/** Kept for layout compatibility — desktop sidebar is always open. */
export function useCollapsibleSidebar() {
  return {
    open: true,
    setOpen: (_: boolean) => {},
    toggle: () => {},
  };
}

export function CollapsibleSidebar({
  title,
  items,
  rootHref,
  footer,
}: {
  title: string;
  items: SidebarNavItem[];
  rootHref: string;
  open?: boolean;
  onToggle?: () => void;
  footer?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: horizontal scroll chips */}
      <nav
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden"
        aria-label={title}
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map(({ href, label }) => {
          const active = isNavActive(pathname, href, rootHref);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-brand-700 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-800"
              }`}
            >
              {label}
            </Link>
          );
        })}
        {footer ? <div className="shrink-0 self-center">{footer}</div> : null}
      </nav>

      {/* Desktop: sticky vertical sidebar */}
      <aside className="hidden md:sticky md:top-20 md:block md:self-start">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          </div>
          <nav className="py-1" aria-label={title}>
            {items.map(({ href, label }) => {
              const active = isNavActive(pathname, href, rootHref);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`mx-1 flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {active ? (
                    <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                  ) : (
                    <span className="mr-2 h-1.5 w-1.5 shrink-0" aria-hidden />
                  )}
                  {label}
                </Link>
              );
            })}
          </nav>
          {footer ? <div className="border-t border-slate-100">{footer}</div> : null}
        </div>
      </aside>
    </>
  );
}
