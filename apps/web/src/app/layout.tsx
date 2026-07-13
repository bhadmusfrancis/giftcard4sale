import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
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
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
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
          <SiteAnalytics />
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium text-slate-700">
                  © {new Date().getFullYear()} GiftCard4Sale.com — Independent gift card exchange
                </p>
                <nav className="flex flex-wrap gap-x-4 gap-y-2 shrink-0">
                  <a href="/about" className="hover:text-brand-700">About</a>
                  <a href="/contact" className="hover:text-brand-700">Contact</a>
                  <a href="/terms" className="hover:text-brand-700">Terms</a>
                  <a href="/privacy" className="hover:text-brand-700">Privacy</a>
                </nav>
              </div>
              <p className="mt-4 text-xs">Trade responsibly. Only submit valid gift cards you legally own.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
