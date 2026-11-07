import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LANG_COOKIE,
  COUNTRY_COOKIE,
  langFromCountry,
  parseAcceptLanguage,
  normalizeLang,
} from "@/lib/locale";

function canonicalOrigin(): URL | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.endsWith("/") ? raw : `${raw}/`);
  } catch {
    return null;
  }
}

// Visitor country from the platform's geo headers (Vercel injects
// x-vercel-ip-country; Cloudflare injects cf-ipcountry). Used to pick the
// site's display language — and later stored on the user profile.
function countryFromRequest(request: NextRequest): string | null {
  const cc =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code");
  if (!cc) return null;
  const ccNorm = cc.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(ccNorm) && ccNorm !== "XX" && ccNorm !== "T1" ? ccNorm : null;
}

// Only assigns cookies when they are missing — a cookie the visitor (or their
// profile) chose always wins over geo/browser detection.
function applyLocaleCookies(request: NextRequest, response: NextResponse) {
  if (!request.cookies.get(LANG_COOKIE)) {
    const cc = countryFromRequest(request);
    const lang = cc
      ? langFromCountry(cc)
      : parseAcceptLanguage(request.headers.get("accept-language"));
    response.cookies.set(LANG_COOKIE, normalizeLang(lang), {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }
  if (!request.cookies.get(COUNTRY_COOKIE)) {
    const cc = countryFromRequest(request);
    if (cc) {
      response.cookies.set(COUNTRY_COOKIE, cc, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Legacy PHP front controller from the old site — 301 to the matching Next.js route.
  if (pathname === "/index.php" || pathname.startsWith("/index.php/")) {
    const next = request.nextUrl.clone();
    next.pathname = pathname.replace(/^\/index\.php/, "") || "/";
    return NextResponse.redirect(next, 301);
  }

  const origin = canonicalOrigin();
  if (!origin) {
    const res = NextResponse.next();
    applyLocaleCookies(request, res);
    return res;
  }

  const canonicalHost = origin.host;
  const host = request.headers.get("host") ?? "";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.endsWith(".local");
  if (isLocal) {
    const res = NextResponse.next();
    applyLocaleCookies(request, res);
    return res;
  }

  const needsHostRedirect = host !== canonicalHost;
  const needsHttpsRedirect = proto !== "https";

  if (needsHostRedirect || needsHttpsRedirect) {
    const target = new URL(`${pathname}${search}`, origin);
    return NextResponse.redirect(target, 301);
  }

  const res = NextResponse.next();
  applyLocaleCookies(request, res);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\..*).*)"],
};
