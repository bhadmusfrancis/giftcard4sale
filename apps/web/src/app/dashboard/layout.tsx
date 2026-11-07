"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { PushAutoEnable } from "@/components/PushAutoEnable";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-500 sm:py-20">
        {t("Loading dashboard…")}
      </div>
    );
  }

  const NAV = [
    { href: "/dashboard", label: t("Overview") },
    { href: "/dashboard/trades", label: t("My trades") },
    { href: "/dashboard/wallet", label: t("Wallet") },
    { href: "/dashboard/referrals", label: t("Referrals") },
    { href: "/dashboard/notifications", label: t("Notifications") },
    { href: "/dashboard/profile", label: t("Profile") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8">
      <PushAutoEnable />
      {!user.emailVerified && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("Please verify your email to open trades and withdraw funds.")}</span>
          <button
            type="button"
            onClick={async () => {
              await api("/auth/resend-verification", { body: {} });
              alert(t("Verification email sent."));
            }}
            className="shrink-0 self-start rounded-lg bg-amber-200/80 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-200 sm:self-auto"
          >
            {t("Resend email")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <CollapsibleSidebar
          title={t("Dashboard")}
          items={NAV}
          rootHref="/dashboard"
          footer={
            user.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="block px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50 md:rounded-none"
              >
                {t("Admin console →")}
              </Link>
            ) : undefined
          }
        />
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
