"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export interface GiftCard {
  id: string;
  name: string;
  slug: string;
  sellSlug: string;
  imageUrl?: string;
  description?: string;
}

function filterCards(cards: GiftCard[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return cards;
  return cards.filter((card) => {
    const haystack = `${card.name} ${card.slug.replace(/-/g, " ")} ${card.description ?? ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

interface GiftCardCatalogProps {
  cards: GiftCard[];
  /** Pre-fill the search box (e.g. from /cards?q=amazon). */
  initialQuery?: string;
  /** Keep the URL in sync with the current search query. */
  syncUrl?: boolean;
}

export function GiftCardCatalog({ cards, initialQuery = "", syncUrl = false }: GiftCardCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? initialQuery);
  }, [searchParams, initialQuery]);

  const filtered = useMemo(() => filterCards(cards, query), [cards, query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!syncUrl) return;
    const next = value.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("q", next);
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `/cards?${qs}` : "/cards", { scroll: false });
  }

  return (
    <div>
      <div className="relative max-w-xl">
        <input
          type="search"
          className="input pr-10"
          placeholder="Search gift cards (Amazon, Steam, iTunes…)"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          aria-label="Search gift cards"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {query && (
        <p className="mt-3 text-sm text-slate-500">
          {filtered.length} {filtered.length === 1 ? "card" : "cards"} matching &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((card) => (
          <Link key={card.id} href={`/${card.sellSlug}`} className="card p-5 transition hover:shadow-md">
            <BrandLogo name={card.name} slug={card.slug} imageUrl={card.imageUrl} className="mb-3 h-12 w-12" />
            <div className="font-semibold">{card.name}</div>
            <div className="text-sm text-brand-700">Check rate →</div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-medium text-slate-700">No gift cards found</p>
          <p className="mt-2 text-sm text-slate-500">
            Try a different search term, or{" "}
            <button type="button" onClick={() => handleQueryChange("")} className="text-brand-700 hover:underline">
              clear the search
            </button>
            .
          </p>
        </div>
      )}
    </div>
  );
}
