"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export type SidebarNavItem = { href: string; label: string };

function isNavActive(pathname: string, href: string, rootHref: string) {
  return pathname === href || (href !== rootHref && pathname.startsWith(href));
}

export function useCollapsibleSidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return {
    open,
    setOpen,
    toggle: () => setOpen((value) => !value),
  };
}

export function CollapsibleSidebar({
  title,
  items,
  rootHref,
  open,
  onToggle,
  footer,
}: {
  title: string;
  items: SidebarNavItem[];
  rootHref: string;
  open: boolean;
  onToggle: () => void;
  footer?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="md:sticky md:top-20 md:self-start">
      <button
        type="button"
        onClick={onToggle}
        className="card flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700"
        aria-expanded={open}
        aria-controls="sidebar-nav"
      >
        <span>{title}</span>
        <span className="text-xs text-slate-400" aria-hidden>
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <nav id="sidebar-nav" className="card mt-2 overflow-hidden">
          {items.map(({ href, label }) => {
            const active = isNavActive(pathname, href, rootHref);
            return (
              <Link
                key={href}
                href={href}
                className={`block px-4 py-3 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
          {footer}
        </nav>
      )}
    </aside>
  );
}
