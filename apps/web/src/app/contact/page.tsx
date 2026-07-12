import type { Metadata } from "next";
import Link from "next/link";
import { BrandAffiliationDisclaimer } from "@/components/BrandAffiliationDisclaimer";
import { EmailSupportButton } from "@/components/EmailSupportButton";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact GiftCard4Sale support for account, trade, and payout questions.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Contact us</h1>
      <p className="mt-4 text-slate-600">
        We&apos;re here to help with GiftCard4Sale accounts, trades, rates, and withdrawals. Use the options below —
        we respond from our official GiftCard4Sale support inbox only.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">Email support</h2>
          <p className="mt-2 text-sm text-slate-600">
            Best for trade issues, withdrawals, and account help. Tap the button to open your email app — we don&apos;t
            publish the inbox address on the page to reduce spam and abuse.
          </p>
          <EmailSupportButton />
          <p className="mt-3 text-xs text-slate-500">
            Already trading with us? You can also message support from the chat on an open trade in your dashboard.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">Website</h2>
          <p className="mt-2 text-sm text-slate-600">All trading happens only on our official site.</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
            giftcard4sale.com
          </Link>
        </div>
      </div>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">What to include</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>Your account email</li>
          <li>Trade ID (if the issue is about a trade)</li>
          <li>A short description of the problem</li>
        </ul>
        <p className="text-sm text-slate-600">
          We will never ask you for passwords to Apple, Amazon, Google, banks, or crypto wallets. GiftCard4Sale only
          needs the gift card details you submit inside your logged-in dashboard.
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <BrandAffiliationDisclaimer />
      </section>

      <p className="mt-8 text-sm text-slate-500">
        Learn more on our{" "}
        <Link href="/about" className="text-brand-700 hover:underline">
          About us
        </Link>{" "}
        page, or read the{" "}
        <Link href="/terms" className="text-brand-700 hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-brand-700 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
