import Link from "next/link";
import type { Metadata } from "next";
import { loadCatalogCards } from "@/lib/catalog";
import { SITE_URL } from "@/lib/seo/site";
import { PopularCards } from "@/components/PopularCards";
import { BrandAffiliationDisclaimer } from "@/components/BrandAffiliationDisclaimer";
import { AppDownloadButtons } from "@/components/AppDownloadButtons";
import { HomeSearchForm } from "@/components/HomeSearchForm";
import { getPageDict, makeTr } from "@/lib/seo/localized";
import { languageAlternates, localizedPath } from "@/lib/locale";

/** Localized pages re-render at most hourly; translations sit in the API's
 *  TranslationCache so repeat renders are cheap. */
export const revalidate = 3600;

const META_TITLE = "GiftCard4Sale — Sell Gift Cards for USDT, Naira & Cedi";
const META_DESC =
  "Sell most types of gift cards for USDT, Naira, or Cedi at great rates. Calculate your rate instantly and open a trade in minutes.";

// Every English source string rendered on this page — module-level so
// generateMetadata and the page share one cached dictionary fetch.
const STRINGS = [
  META_TITLE,
  META_DESC,
  "Sell your gift cards for",
  "or",
  "GiftCard4Sale is an independent exchange. Calculate your payout, open a trade on our platform, and get paid fast — physical cards and e-codes welcome.",
  "Browse all cards",
  "Create account",
  "Popular gift cards",
  "View all",
  "How it works",
  "Everything happens on GiftCard4Sale.com with your own account — we never ask for issuer passwords or bank logins.",
  "1. Pick your card",
  "Choose the gift card type and country, then enter the amount.",
  "2. Calculate rate",
  "See your exact payout in USDT, Naira or Cedi before committing.",
  "3. Open a trade",
  "Upload the card pictures or paste the e-code and submit.",
  "4. Get paid",
  "Once approved, your wallet is credited. Withdraw anytime.",
  "About GiftCard4Sale",
  "Contact support",
  "Get the GiftCard4Sale app",
  "Install GiftCard4Sale on your phone — check live rates, trade and withdraw from your home screen. No app store needed.",
  "Earn 1% for life",
  "Invite friends with your referral link and earn 1% of every successful trade they make — forever.",
  "Start referring",
  "Real-time referral dashboard",
  "Earnings in USDT, Naira & Cedi",
  "Withdraw to bank or crypto",
] as const;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  return {
    title: { absolute: tr(META_TITLE) },
    description: tr(META_DESC),
    alternates: {
      canonical: localizedPath(params.lang, "/"),
      languages: languageAlternates("/"),
    },
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: { lang: string };
}) {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  const { cards } = await loadCatalogCards({ revalidate: 300, timeoutMs: 5000 });
  const lang = params.lang;

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

  const steps = [
    ["1. Pick your card", "Choose the gift card type and country, then enter the amount."],
    ["2. Calculate rate", "See your exact payout in USDT, Naira or Cedi before committing."],
    ["3. Open a trade", "Upload the card pictures or paste the e-code and submit."],
    ["4. Get paid", "Once approved, your wallet is credited. Withdraw anytime."],
  ] as const;

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {tr("Sell your gift cards for")} <span className="text-brand-100">USDT, Naira</span>{" "}
            {tr("or")} <span className="text-brand-100">Cedi</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-50/90">
            {tr("GiftCard4Sale is an independent exchange. Calculate your payout, open a trade on our platform, and get paid fast — physical cards and e-codes welcome.")}
          </p>
          <HomeSearchForm />
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href={localizedPath(lang, "/cards")} className="btn border border-white/40 text-white hover:bg-white/10">{tr("Browse all cards")}</Link>
            <Link href="/register" className="btn border border-white/40 text-white hover:bg-white/10">{tr("Create account")}</Link>
          </div>
        </div>
      </section>

      {/* Card grid */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">{tr("Popular gift cards")}</h2>
          <Link href={localizedPath(lang, "/cards")} className="text-brand-700 hover:underline">{tr("View all")}</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <PopularCards initialCards={cards} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold text-center">{tr("How it works")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            {tr("Everything happens on GiftCard4Sale.com with your own account — we never ask for issuer passwords or bank logins.")}
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {steps.map(([step, d]) => (
              <div key={step} className="card p-6">
                <div className="text-brand-700 font-bold">{tr(step)}</div>
                <p className="mt-2 text-sm text-slate-600">{tr(d)}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <BrandAffiliationDisclaimer />
          </div>
          <p className="mt-4 text-center text-sm">
            <Link href={localizedPath(lang, "/about")} className="font-semibold text-brand-700 hover:underline">
              {tr("About GiftCard4Sale")}
            </Link>
            {" · "}
            <Link href={localizedPath(lang, "/contact")} className="font-semibold text-brand-700 hover:underline">
              {tr("Contact support")}
            </Link>
          </p>
        </div>
      </section>

      {/* App download */}
      <section className="bg-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-2xl font-bold">{tr("Get the GiftCard4Sale app")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-brand-50/90">
            {tr("Install GiftCard4Sale on your phone — check live rates, trade and withdraw from your home screen. No app store needed.")}
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
              <h3 className="text-2xl font-bold">{tr("Earn 1% for life")}</h3>
              <p className="mt-3 text-slate-600">
                {tr("Invite friends with your referral link and earn 1% of every successful trade they make — forever.")}
              </p>
              <Link href="/register" className="btn-primary mt-6">{tr("Start referring")}</Link>
            </div>
            <div className="bg-brand-700 p-8 text-white">
              <ul className="space-y-3">
                <li>✓ {tr("Real-time referral dashboard")}</li>
                <li>✓ {tr("Earnings in USDT, Naira & Cedi")}</li>
                <li>✓ {tr("Withdraw to bank or crypto")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
