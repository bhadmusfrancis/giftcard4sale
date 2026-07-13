"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { trackPageView } from "@/lib/siteAnalytics";

/**
 * Records anonymous first-party page views for the admin Traffic dashboard.
 * Skips /admin routes and logged-in admins.
 */
export function SiteAnalytics() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || loading) return;
    if (user?.role === "ADMIN") return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname);
  }, [pathname, loading, user?.role]);

  return null;
}
