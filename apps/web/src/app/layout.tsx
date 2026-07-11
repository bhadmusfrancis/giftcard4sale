import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { MetaPixel } from "@/components/MetaPixel";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { GoogleAdsClickIdCapture } from "@/components/GoogleAdsClickIdCapture";
import { SUPPORT_EMAIL } from "@/lib/site";
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
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p>© {new Date().getFullYear()} GiftCard4Sale.com — Sell gift cards for USDT, Naira &amp; Cedi.</p>
                <nav className="flex flex-wrap gap-x-4 gap-y-1">
                  <a href="/terms" className="hover:text-brand-700">Terms of Service</a>
                  <a href="/privacy" className="hover:text-brand-700">Privacy Policy</a>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand-700">Contact</a>
                </nav>
              </div>
              <p className="mt-3 text-xs">Trade responsibly. Only submit valid gift cards.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
