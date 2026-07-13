import Link from "next/link";
import type { Metadata } from "next";
import { apiServer } from "@/lib/api";
import { PopularCards } from "@/components/PopularCards";
import { BrandAffiliationDisclaimer } from "@/components/BrandAffiliationDisclaimer";
import type { GiftCard } from "@/components/GiftCardCatalog";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Cache homepage card list; avoids blocking every visit on a slow API round-trip. */
export const revalidate = 300;

interface Card {
  id: string;
  name: string;
  slug: string;
  sellSlug: string;
  imageUrl?: string;
}

export default async function HomePage() {
  const data = await apiServer<{ cards: Card[] }>("/cards", { revalidate: 300, timeoutMs: 5000 });
  const cards = (data?.cards ?? []) as GiftCard[];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Sell your gift cards for <span className="text-brand-100">USDT, Naira</span> or{" "}
            <span className="text-brand-100">Cedi</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-50/90">
            GiftCard4Sale is an independent exchange. Calculate your payout, open a trade on our platform, and get paid
            fast — physical cards and e-codes welcome.
          </p>
          <form action="/cards" method="get" className="mx-auto mt-8 flex max-w-lg gap-2">
            <input
              name="q"
              type="search"
              className="input flex-1 border-white/20 bg-white/95 text-slate-900 placeholder:text-slate-500"
              placeholder="Search gift cards (Amazon, Steam, iTunes…)"
              aria-label="Search gift cards"
            />
            <button type="submit" className="btn shrink-0 bg-white text-brand-800 hover:bg-brand-50">
              Search
            </button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/cards" className="btn border border-white/40 text-white hover:bg-white/10">Browse all cards</Link>
            <Link href="/register" className="btn border border-white/40 text-white hover:bg-white/10">Create account</Link>
          </div>
        </div>
      </section>

      {/* Card grid */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Popular gift cards</h2>
          <Link href="/cards" className="text-brand-700 hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <PopularCards initialCards={cards} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold text-center">How it works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            Everything happens on GiftCard4Sale.com with your own account — we never ask for issuer passwords or bank
            logins.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ["1. Pick your card", "Choose the gift card type and country, then enter the amount."],
              ["2. Calculate rate", "See your exact payout in USDT, Naira or Cedi before committing."],
              ["3. Open a trade", "Upload the card pictures or paste the e-code and submit."],
              ["4. Get paid", "Once approved, your wallet is credited. Withdraw anytime."],
            ].map(([t, d]) => (
              <div key={t} className="card p-6">
                <div className="text-brand-700 font-bold">{t}</div>
                <p className="mt-2 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <BrandAffiliationDisclaimer />
          </div>
          <p className="mt-4 text-center text-sm">
            <Link href="/about" className="font-semibold text-brand-700 hover:underline">
              About GiftCard4Sale
            </Link>
            {" · "}
            <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="card overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8">
              <h3 className="text-2xl font-bold">Earn 1% for life</h3>
              <p className="mt-3 text-slate-600">
                Invite friends with your referral link and earn 1% of every successful trade they make — forever.
              </p>
              <Link href="/register" className="btn-primary mt-6">Start referring</Link>
            </div>
            <div className="bg-brand-700 p-8 text-white">
              <ul className="space-y-3">
                <li>✓ Real-time referral dashboard</li>
                <li>✓ Earnings in USDT, Naira & Cedi</li>
                <li>✓ Withdraw to bank or crypto</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
