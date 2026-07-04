import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function canonicalOrigin(): URL | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.endsWith("/") ? raw : `${raw}/`);
  } catch {
    return null;
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
  if (!origin) return NextResponse.next();

  const canonicalHost = origin.host;
  const host = request.headers.get("host") ?? "";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.endsWith(".local");
  if (isLocal) return NextResponse.next();

  const needsHostRedirect = host !== canonicalHost;
  const needsHttpsRedirect = proto !== "https";

  if (needsHostRedirect || needsHttpsRedirect) {
    const target = new URL(`${pathname}${search}`, origin);
    return NextResponse.redirect(target, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\..*).*)"],
};
