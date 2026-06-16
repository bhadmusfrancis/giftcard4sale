import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
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
  alternates: { canonical: "/" },
  openGraph: {
    title: "GiftCard4Sale",
    description: "Sell gift cards for USDT, Naira & Cedi.",
    url: SITE,
    siteName: "GiftCard4Sale",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
              <p>© {new Date().getFullYear()} GiftCard4Sale.com — Sell gift cards for USDT, Naira & Cedi.</p>
              <p>Trade responsibly. Never submit used or invalid cards.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
