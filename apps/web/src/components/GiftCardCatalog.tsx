"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { api } from "@/lib/api";

export interface GiftCard {
  id: string;
  name: string;
  slug: string;
  sellSlug: string;
  imageUrl?: string;
  description?: string;
}

export function filterCards(cards: GiftCard[], query: string) {
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
  /** `cards` came from the last-known-good snapshot, not a live API response. */
  stale?: boolean;
}

export function GiftCardCatalog({
  cards,
  initialQuery = "",
  syncUrl = false,
  stale = false,
}: GiftCardCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [liveCards, setLiveCards] = useState<GiftCard[] | null>(null);
  const [showStaleNotice, setShowStaleNotice] = useState(stale && cards.length > 0);
  const [catalogState, setCatalogState] = useState<"idle" | "loading" | "error" | "ready">(
    cards.length > 0 ? "ready" : "idle"
  );

  useEffect(() => {
    setQuery(searchParams.get("q") ?? initialQuery);
  }, [searchParams, initialQuery]);

  // SSR can miss the API when the server starts before the API is ready. When it
  // served a snapshot we keep showing it and refresh quietly in the background.
  useEffect(() => {
    const isEmpty = cards.length === 0;
    if (!isEmpty && !stale) {
      setCatalogState("ready");
      return;
    }

    let cancelled = false;
    if (isEmpty) setCatalogState("loading");

    api<{ cards: GiftCard[] }>("/cards")
      .then((data) => {
        if (cancelled) return;
        const fresh = data.cards ?? [];
        if (fresh.length > 0 || isEmpty) setLiveCards(fresh);
        if (fresh.length > 0) setShowStaleNotice(false);
        setCatalogState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        if (!isEmpty) return; // keep the snapshot on screen
        setLiveCards([]);
        setCatalogState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [cards.length, stale]);

  const catalogCards = liveCards ?? cards;
  const filtered = useMemo(() => filterCards(catalogCards, query), [catalogCards, query]);

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

      {showStaleNotice && catalogCards.length > 0 && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing our last known catalog — live rates are refreshing. Open a card to see the rate it was last traded at.
        </p>
      )}

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
          <p className="font-medium text-slate-700">
            {catalogState === "loading" || catalogState === "idle"
              ? "Loading gift cards…"
              : catalogState === "error"
                ? "Couldn't load gift cards"
                : "No gift cards found"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {catalogState === "loading" || catalogState === "idle" ? (
              "Loading gift cards from our catalog."
            ) : catalogState === "error" ? (
              <>
                Our catalog is temporarily unavailable.{" "}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-brand-700 hover:underline"
                >
                  Try again
                </button>
                .
              </>
            ) : (
              <>
                Try a different search term, or{" "}
                <button type="button" onClick={() => handleQueryChange("")} className="text-brand-700 hover:underline">
                  clear the search
                </button>
                .
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
