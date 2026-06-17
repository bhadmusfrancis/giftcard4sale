import { Suspense } from "react";
import { apiServer } from "@/lib/api";
import { GiftCardCatalog } from "@/components/GiftCardCatalog";

export const metadata = { title: "Sell a gift card" };

interface Card {
  id: string;
  name: string;
  slug: string;
  sellSlug: string;
  imageUrl?: string;
  description?: string;
}

export default async function CardsPage({ searchParams }: { searchParams: { q?: string } }) {
  const data = await apiServer<{ cards: Card[] }>("/cards");
  const cards = data?.cards ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Which gift card do you want to sell?</h1>
      <p className="mt-2 text-slate-600">Search or browse cards to calculate your rate and open a trade.</p>

      <Suspense fallback={<div className="mt-8 h-10 max-w-xl animate-pulse rounded-lg bg-slate-200" />}>
        <div className="mt-8">
          <GiftCardCatalog cards={cards} initialQuery={searchParams.q ?? ""} syncUrl />
        </div>
      </Suspense>
    </div>
  );
}
