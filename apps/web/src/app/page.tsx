import Link from "next/link";
import { apiServer } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";

interface Card {
  id: string;
  name: string;
  slug: string;
  sellSlug: string;
  imageUrl?: string;
}

export default async function HomePage() {
  const data = await apiServer<{ cards: Card[] }>("/cards");
  const cards = data?.cards ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Sell your gift cards for <span className="text-brand-100">USDT, Naira</span> or <span className="text-brand-100">Cedi</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-50/90">
            Get the best rates in seconds. Calculate your payout, open a trade, and get paid fast — physical cards and e-codes welcome.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/cards" className="btn bg-white text-brand-800 hover:bg-brand-50">Calculate a rate</Link>
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
          {cards.slice(0, 12).map((c) => (
            <Link key={c.id} href={`/${c.sellSlug}`} className="card p-5 hover:shadow-md transition">
              <BrandLogo name={c.name} slug={c.slug} imageUrl={c.imageUrl} className="mb-3 h-12 w-12 text-lg" />
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-slate-500">Check rate →</div>
            </Link>
          ))}
          {cards.length === 0 && (
            <p className="text-slate-500">No cards yet. Run the seed script to load card types.</p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold text-center">How it works</h2>
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
