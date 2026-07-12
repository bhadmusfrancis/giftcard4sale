"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-3 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-extrabold text-lg text-brand-700 sm:text-xl">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-700 text-white">G</span>
          <span className="truncate">GiftCard4Sale</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/cards" className="text-slate-600 hover:text-brand-700">Sell a card</Link>
          <Link href="/about" className="text-slate-600 hover:text-brand-700">About</Link>
          <Link href="/contact" className="text-slate-600 hover:text-brand-700">Contact</Link>
          <Link href="/insights" className="text-slate-600 hover:text-brand-700">Insights</Link>
          <Link href="/#how" className="text-slate-600 hover:text-brand-700">How it works</Link>
          {!loading && user ? (
            <>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-slate-600 hover:text-brand-700">Admin</Link>
              )}
              <Link href="/dashboard" className="btn-ghost py-2">Dashboard</Link>
              <button onClick={logout} className="text-slate-500 hover:text-red-600">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-brand-700">Login</Link>
              <Link href="/register" className="btn-primary py-2">Get started</Link>
            </>
          )}
        </nav>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <div className="space-y-1.5">
            <span className="block h-0.5 w-6 bg-slate-700" />
            <span className="block h-0.5 w-6 bg-slate-700" />
            <span className="block h-0.5 w-6 bg-slate-700" />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/cards" onClick={() => setOpen(false)}>Sell a card</Link>
            <Link href="/about" onClick={() => setOpen(false)}>About</Link>
            <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
            <Link href="/insights" onClick={() => setOpen(false)}>Insights</Link>
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                {user.role === "ADMIN" && <Link href="/admin" onClick={() => setOpen(false)}>Admin</Link>}
                <button onClick={logout} className="text-left text-red-600">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>Login</Link>
                <Link href="/register" onClick={() => setOpen(false)}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
