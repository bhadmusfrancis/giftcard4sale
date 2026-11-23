import { Suspense } from "react";
import type { Metadata } from "next";
import { loadCatalogCards } from "@/lib/catalog";
import { GiftCardCatalog } from "@/components/GiftCardCatalog";
import { getPageDict, makeTr } from "@/lib/seo/localized";
import { languageAlternates, localizedPath } from "@/lib/locale";

export const revalidate = 3600;

const META_TITLE = "Sell a Gift Card";
const META_DESC =
  "Browse and search our gift card catalog. Compare live payout rates in USDT, Naira, or Cedi and open a trade in minutes.";

const STRINGS = [
  META_TITLE,
  META_DESC,
  "Which gift card do you want to sell?",
  "Search or browse cards to calculate your rate and open a trade.",
] as const;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  return {
    title: tr(META_TITLE),
    description: tr(META_DESC),
    alternates: {
      canonical: localizedPath(params.lang, "/cards"),
      languages: languageAlternates("/cards"),
    },
    openGraph: {
      title: tr(META_TITLE),
      description: tr(META_DESC),
      url: localizedPath(params.lang, "/cards"),
    },
  };
}

export default async function LocalizedCardsPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { q?: string };
}) {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  const { cards, stale } = await loadCatalogCards();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">{tr("Which gift card do you want to sell?")}</h1>
      <p className="mt-2 text-slate-600">{tr("Search or browse cards to calculate your rate and open a trade.")}</p>

      <Suspense fallback={<div className="mt-8 h-10 max-w-xl animate-pulse rounded-lg bg-slate-200" />}>
        <div className="mt-8">
          <GiftCardCatalog cards={cards} initialQuery={searchParams.q ?? ""} syncUrl stale={stale} />
        </div>
      </Suspense>
    </div>
  );
}
