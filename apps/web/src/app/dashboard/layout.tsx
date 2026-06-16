"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const NAV = [
  ["/dashboard", "Overview"],
  ["/dashboard/trades", "My trades"],
  ["/dashboard/wallet", "Wallet"],
  ["/dashboard/referrals", "Referrals"],
  ["/dashboard/notifications", "Notifications"],
  ["/dashboard/profile", "Profile"],
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {!user.emailVerified && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
          <span>⚠️ Please verify your email to open trades and withdraw funds.</span>
          <button
            onClick={async () => {
              await api("/auth/resend-verification", { body: {} });
              alert("Verification email sent.");
            }}
            className="font-semibold underline"
          >
            Resend email
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <nav className="card overflow-hidden">
            {NAV.map(([href, label]) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
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
            {user.role === "ADMIN" && (
              <Link href="/admin" className="block px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Admin console →
              </Link>
            )}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
