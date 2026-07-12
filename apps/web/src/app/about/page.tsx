import type { Metadata } from "next";
import Link from "next/link";
import { BrandAffiliationDisclaimer } from "@/components/BrandAffiliationDisclaimer";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "GiftCard4Sale is an independent gift card exchange. Sell unused gift cards for USDT, Nigerian Naira, or Ghana Cedi on giftcard4sale.com.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-medium text-brand-700">GiftCard4Sale</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">About us</h1>
      <p className="mt-4 text-lg text-slate-600">
        We operate an independent online platform where people sell unused gift cards and get paid in USDT, Nigerian
        Naira (NGN), or Ghanaian Cedi (GHS).
      </p>

      <section className="mt-10 space-y-4 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">What we do</h2>
        <p>
          GiftCard4Sale.com is our own branded marketplace. Customers create an account on our website, check live
          rates, submit a gift card (photos or e-code), and — after verification — receive payout credit in their
          GiftCard4Sale wallet. They can then withdraw to bank transfer, mobile money, or USDT, subject to our
          processes and limits.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Choose a card type and calculate your payout on our site.</li>
          <li>Submit the card you legally own through your GiftCard4Sale account.</li>
          <li>We review the submission on our platform.</li>
          <li>Approved trades credit your GiftCard4Sale wallet; you withdraw when ready.</li>
        </ol>
      </section>

      <section className="mt-10 space-y-4 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">Who we are</h2>
        <p>
          GiftCard4Sale is an independent business serving sellers primarily in Nigeria and Ghana, and other customers
          who can legally use the Service. We are not a bank, not a crypto exchange login portal, and not an official
          store for Apple, Amazon, Steam, Google, Microsoft, or any gift card issuer.
        </p>
        <p>
          All trading happens on <strong>giftcard4sale.com</strong> under the GiftCard4Sale name and logo. We never ask
          for your Apple ID password, Amazon password, bank login, or cryptocurrency seed phrases.
        </p>
      </section>

      <section className="mt-10 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">Brand relationships</h2>
        <BrandAffiliationDisclaimer className="!text-sm !text-slate-600" />
      </section>

      <section className="mt-10 space-y-4 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">Trust &amp; safety</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Only submit gift cards you legally own.</li>
          <li>Email verification is required before trading or withdrawing.</li>
          <li>Invalid, used, or fraudulent cards may be rejected and can affect account standing.</li>
          <li>
            Read our{" "}
            <Link href="/terms" className="font-medium text-brand-700 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
              Privacy Policy
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">Contact</h2>
        <p>
          Questions about the Service, an account, or a trade: visit our{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            Contact page
          </Link>
          .
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/cards" className="btn-primary">
          Sell a gift card
        </Link>
        <Link href="/contact" className="btn-ghost">
          Contact support
        </Link>
      </div>
    </div>
  );
}
