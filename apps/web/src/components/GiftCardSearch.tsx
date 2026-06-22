"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { api } from "@/lib/api";
import { filterCards, type GiftCard } from "@/components/GiftCardCatalog";

interface GiftCardSearchProps {
  cards: GiftCard[];
  /** Hide the current card from results (sell slug). */
  currentSellSlug?: string;
  maxResults?: number;
}

export function GiftCardSearch({ cards, currentSellSlug, maxResults = 8 }: GiftCardSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [liveCards, setLiveCards] = useState<GiftCard[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cards.length > 0) return;
    api<{ cards: GiftCard[] }>("/cards")
      .then((data) => setLiveCards(data.cards ?? []))
      .catch(() => setLiveCards([]));
  }, [cards.length]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const catalogCards = liveCards ?? cards;

  const results = useMemo(() => {
    const needle = query.trim();
    if (!needle) return [];
    return filterCards(catalogCards, needle)
      .filter((card) => card.sellSlug !== currentSellSlug)
      .slice(0, maxResults);
  }, [catalogCards, query, currentSellSlug, maxResults]);

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative max-w-xl">
      <label htmlFor="gift-card-search" className="label">
        Search active cards
      </label>
      <div className="relative">
        <input
          id="gift-card-search"
          type="search"
          className="input pr-10"
          placeholder="Amazon, Steam, iTunes…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Search active gift cards"
          aria-expanded={showDropdown}
          aria-controls="gift-card-search-results"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown ? (
        <ul
          id="gift-card-search-results"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {results.length > 0 ? (
            results.map((card) => (
              <li key={card.id} role="option">
                <Link
                  href={`/${card.sellSlug}`}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <BrandLogo name={card.name} slug={card.slug} imageUrl={card.imageUrl} className="h-8 w-8 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{card.name}</span>
                  <span className="shrink-0 text-xs text-brand-700">View rate →</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-slate-500">No active cards match &ldquo;{query}&rdquo;</li>
          )}
          <li className="border-t border-slate-100 px-3 py-2">
            <Link href="/cards" className="text-xs font-medium text-brand-700 hover:underline">
              Browse all cards →
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
