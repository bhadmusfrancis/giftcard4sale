import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider, T } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { MetaPixel } from "@/components/MetaPixel";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { GoogleAdsClickIdCapture } from "@/components/GoogleAdsClickIdCapture";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SITE_URL } from "@/lib/seo/site";

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GiftCard4Sale — Sell Gift Cards for USDT, Naira & Cedi",
    template: "%s | GiftCard4Sale",
  },
  description:
    "Sell most types of gift cards for USDT, Naira, or Cedi at great rates. Calculate your rate instantly and open a trade in minutes.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "GiftCard4Sale",
    statusBarStyle: "black-translucent",
  },
  ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
  openGraph: {
    title: "GiftCard4Sale",
    description: "Sell gift cards for USDT, Naira & Cedi.",
    url: SITE_URL,
    siteName: "GiftCard4Sale",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* beforeInteractive injects the Meta Pixel base code into <head> on every page */}
        <MetaPixel />
        <GoogleAdsTag />
        <GoogleAdsClickIdCapture />
        <AuthProvider>
          <I18nProvider>
            <Suspense fallback={null}>
              <SiteAnalytics />
            </Suspense>
            <Navbar />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            <footer className="border-t border-slate-200 bg-white">
              <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-700">
                    <T vars={{ year: new Date().getFullYear() }}>
                      {"© {year} GiftCard4Sale.com — Independent gift card exchange"}
                    </T>
                  </p>
                  <nav className="flex flex-wrap gap-x-4 gap-y-2 shrink-0">
                    <a href="/about" className="hover:text-brand-700"><T>About</T></a>
                    <a href="/contact" className="hover:text-brand-700"><T>Contact</T></a>
                    <a href="/terms" className="hover:text-brand-700"><T>Terms</T></a>
                    <a href="/privacy" className="hover:text-brand-700"><T>Privacy</T></a>
                  </nav>
                </div>
                <p className="mt-4 text-xs"><T>Trade responsibly. Only submit valid gift cards you legally own.</T></p>
              </div>
            </footer>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
