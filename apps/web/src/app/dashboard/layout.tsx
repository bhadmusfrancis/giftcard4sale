"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { CollapsibleSidebar, useCollapsibleSidebar } from "@/components/CollapsibleSidebar";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/trades", label: "My trades" },
  { href: "/dashboard/wallet", label: "Wallet" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { open, toggle } = useCollapsibleSidebar();

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

      <div className={`grid gap-6 ${open ? "md:grid-cols-[220px_1fr]" : ""}`}>
        <CollapsibleSidebar
          title="Dashboard menu"
          items={NAV}
          rootHref="/dashboard"
          open={open}
          onToggle={toggle}
          footer={
            user.role === "ADMIN" ? (
              <Link href="/admin" className="block px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Admin console →
              </Link>
            ) : undefined
          }
        />
        <section>{children}</section>
      </div>
    </div>
  );
}
