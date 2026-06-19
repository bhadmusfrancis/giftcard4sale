"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import type { GiftCard } from "@/components/GiftCardCatalog";

export function PopularCards({ initialCards }: { initialCards: GiftCard[] }) {
  const [cards, setCards] = useState(initialCards);

  useEffect(() => {
    if (initialCards.length > 0) return;
    api<{ cards: GiftCard[] }>("/cards")
      .then((data) => setCards(data.cards ?? []))
      .catch(() => setCards([]));
  }, [initialCards.length]);

  if (cards.length === 0) {
    return (
      <p className="col-span-full text-slate-500">
        Loading popular gift cards…
      </p>
    );
  }

  return (
    <>
      {cards.slice(0, 12).map((c) => (
        <Link key={c.id} href={`/${c.sellSlug}`} className="card p-5 transition hover:shadow-md">
          <BrandLogo name={c.name} slug={c.slug} imageUrl={c.imageUrl} className="mb-3 h-12 w-12 text-lg" />
          <div className="font-semibold">{c.name}</div>
          <div className="text-sm text-slate-500">Check rate →</div>
        </Link>
      ))}
    </>
  );
}
