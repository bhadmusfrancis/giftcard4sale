import Link from "next/link";
import { apiServer } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = { title: "Sell a gift card" };

interface Card {
  id: string;
  name: string;
  slug: string;
  sellSlug: string;
  imageUrl?: string;
}

export default async function CardsPage() {
  const data = await apiServer<{ cards: Card[] }>("/cards");
  const cards = data?.cards ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Which gift card do you want to sell?</h1>
      <p className="mt-2 text-slate-600">Select a card to calculate your rate and open a trade.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.id} href={`/${c.sellSlug}`} className="card p-5 hover:shadow-md transition">
            <BrandLogo name={c.name} slug={c.slug} imageUrl={c.imageUrl} className="mb-3 h-12 w-12" />
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-brand-700">Check rate →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
