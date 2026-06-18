"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { CollapsibleSidebar, useCollapsibleSidebar } from "@/components/CollapsibleSidebar";

const NAV = [
  { href: "/admin", label: "Overview" },
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
  const { open, toggle } = useCollapsibleSidebar();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/login?next=/admin");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="badge bg-slate-900 text-white">ADMIN</span>
        <h1 className="text-lg font-bold">Admin console</h1>
      </div>
      <div className={`grid gap-6 ${open ? "md:grid-cols-[200px_1fr]" : ""}`}>
        <CollapsibleSidebar
          title="Admin menu"
          items={NAV}
          rootHref="/admin"
          open={open}
          onToggle={toggle}
        />
        <section>{children}</section>
      </div>
    </div>
  );
}
