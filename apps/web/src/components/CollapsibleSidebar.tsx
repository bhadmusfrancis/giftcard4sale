"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef } from "react";

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
  const mobileNavRef = useRef<HTMLElement>(null);

  // Keep the current section's chip visible when the page changes.
  useEffect(() => {
    const nav = mobileNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    nav.scrollTo({ left: active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2, behavior: "smooth" });
  }, [pathname]);

  return (
    <>
      {/* Mobile: sticky, horizontally scrolling chips under the site navbar */}
      <div className="sticky top-16 z-30 -mx-3 min-w-0 border-b border-slate-200/80 bg-slate-50/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 md:hidden">
        <nav ref={mobileNavRef} className="scrollbar-none flex gap-2 overflow-x-auto" aria-label={title}>
          {items.map(({ href, label }) => {
            const active = isNavActive(pathname, href, rootHref);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={active ? "chip-on" : "chip-off"}
              >
                {label}
              </Link>
            );
          })}
          {footer ? <div className="shrink-0 self-center">{footer}</div> : null}
        </nav>
      </div>

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
                  aria-current={active ? "page" : undefined}
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
