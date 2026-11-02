"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { PushAutoEnable } from "@/components/PushAutoEnable";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/traffic", label: "Traffic" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/trades", label: "Trades" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/rates", label: "Rates & cards" },
  { href: "/admin/landing", label: "Landing pages" },
  { href: "/admin/referrals", label: "Referrals" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/login?next=/admin");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500 sm:py-20">
        Loading admin…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
      <PushAutoEnable />
      <div className="mb-3 hidden items-center gap-2 sm:mb-6 md:flex">
        <span className="badge bg-slate-900 text-white">ADMIN</span>
        <h1 className="text-lg font-bold text-slate-900">Admin console</h1>
        <span className="text-sm text-slate-400">·</span>
        <p className="min-w-0 truncate text-sm text-slate-500">
          {pathname === "/admin" ? "Overview" : pathname.replace("/admin/", "").replace(/\//g, " / ")}
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <CollapsibleSidebar title="Admin" items={NAV} rootHref="/admin" />
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
