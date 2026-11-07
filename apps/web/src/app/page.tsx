import Link from "next/link";
import type { Metadata } from "next";
import { loadCatalogCards } from "@/lib/catalog";
import { SITE_URL } from "@/lib/seo/site";
import { PopularCards } from "@/components/PopularCards";
import { BrandAffiliationDisclaimer } from "@/components/BrandAffiliationDisclaimer";
import { AppDownloadButtons } from "@/components/AppDownloadButtons";
import { HomeSearchForm } from "@/components/HomeSearchForm";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Cache homepage card list; avoids blocking every visit on a slow API round-trip. */
export const revalidate = 300;

export default async function HomePage() {
  const { cards } = await loadCatalogCards({ revalidate: 300, timeoutMs: 5000 });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "GiftCard4Sale",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        description: "Independent gift card exchange — sell gift cards for USDT, Naira or Cedi.",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "GiftCard4Sale",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/cards?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            <T>Sell your gift cards for</T> <span className="text-brand-100">USDT, Naira</span>{" "}
            <T>or</T> <span className="text-brand-100">Cedi</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-50/90">
            <T>GiftCard4Sale is an independent exchange. Calculate your payout, open a trade on our platform, and get paid fast — physical cards and e-codes welcome.</T>
          </p>
          <HomeSearchForm />
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/cards" className="btn border border-white/40 text-white hover:bg-white/10"><T>Browse all cards</T></Link>
            <Link href="/register" className="btn border border-white/40 text-white hover:bg-white/10"><T>Create account</T></Link>
          </div>
        </div>
      </section>

      {/* Card grid */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold"><T>Popular gift cards</T></h2>
          <Link href="/cards" className="text-brand-700 hover:underline"><T>View all</T></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <PopularCards initialCards={cards} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold text-center"><T>How it works</T></h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            <T>Everything happens on GiftCard4Sale.com with your own account — we never ask for issuer passwords or bank logins.</T>
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {(
              [
                ["1. Pick your card", "Choose the gift card type and country, then enter the amount."],
                ["2. Calculate rate", "See your exact payout in USDT, Naira or Cedi before committing."],
                ["3. Open a trade", "Upload the card pictures or paste the e-code and submit."],
                ["4. Get paid", "Once approved, your wallet is credited. Withdraw anytime."],
              ] as const
            ).map(([step, d]) => (
              <div key={step} className="card p-6">
                <div className="text-brand-700 font-bold"><T>{step}</T></div>
                <p className="mt-2 text-sm text-slate-600"><T>{d}</T></p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <BrandAffiliationDisclaimer />
          </div>
          <p className="mt-4 text-center text-sm">
            <Link href="/about" className="font-semibold text-brand-700 hover:underline">
              <T>About GiftCard4Sale</T>
            </Link>
            {" · "}
            <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
              <T>Contact support</T>
            </Link>
          </p>
        </div>
      </section>

      {/* App download */}
      <section className="bg-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-2xl font-bold"><T>Get the GiftCard4Sale app</T></h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-brand-50/90">
            <T>Install GiftCard4Sale on your phone — check live rates, trade and withdraw from your home screen. No app store needed.</T>
          </p>
          <div className="mt-8">
            <AppDownloadButtons />
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="card overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8">
              <h3 className="text-2xl font-bold"><T>Earn 1% for life</T></h3>
              <p className="mt-3 text-slate-600">
                <T>Invite friends with your referral link and earn 1% of every successful trade they make — forever.</T>
              </p>
              <Link href="/register" className="btn-primary mt-6"><T>Start referring</T></Link>
            </div>
            <div className="bg-brand-700 p-8 text-white">
              <ul className="space-y-3">
                <li>✓ <T>Real-time referral dashboard</T></li>
                <li>✓ <T>Earnings in USDT, Naira & Cedi</T></li>
                <li>✓ <T>Withdraw to bank or crypto</T></li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
