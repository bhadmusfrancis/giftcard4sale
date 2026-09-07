import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { fixDuplicateSellSlug } from "@gc4s/shared";
import { apiServer } from "@/lib/api";
import { loadCardRates, loadCatalogCards, type CardRatesResponse } from "@/lib/catalog";
import { CardRatePanel } from "@/components/CardRatePanel";
import { BrandLogo } from "@/components/BrandLogo";
import { GiftCardSearch } from "@/components/GiftCardSearch";
import { MetaViewContent } from "@/components/MetaViewContent";

interface LandingResp {
  page: {
    slug: string;
    title: string;
    metaTitle?: string;
    metaDesc?: string;
    bodyHtml: string;
    sourceUrl?: string;
    cardType?: { id: string; slug: string; sellSlug: string; name: string } | null;
  };
}

type CardResp = CardRatesResponse;

const RATE_BREAK = "<!--rate-break-->";

function splitArticleHtml(bodyHtml: string): { leadHtml: string; restHtml: string } {
  const idx = bodyHtml.indexOf(RATE_BREAK);
  if (idx === -1) return { leadHtml: bodyHtml, restHtml: "" };
  return {
    leadHtml: bodyHtml.slice(0, idx).trim(),
    restHtml: bodyHtml.slice(idx + RATE_BREAK.length).trim(),
  };
}

const articleProse =
  "prose prose-slate max-w-none " +
  "[&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-1.5 [&_p]:my-3 [&_p]:leading-relaxed " +
  "[&_.faq-list]:mt-4 [&_.faq-list]:space-y-3 " +
  "[&_.faq-item]:rounded-lg [&_.faq-item]:border [&_.faq-item]:border-slate-200 [&_.faq-item]:bg-slate-50/80 [&_.faq-item]:px-4 [&_.faq-item]:py-3 " +
  "[&_.faq-item_summary]:cursor-pointer [&_.faq-item_p]:mt-2 [&_.faq-item_p]:text-sm [&_.faq-item_p]:text-slate-600 " +
  "[&_.balance-steps]:my-4 [&_.sell-steps]:my-4";

async function load(slug: string) {
  const landing = await apiServer<LandingResp>(`/landing/${slug}`);
  const cardSlug = landing?.page.cardType?.sellSlug || landing?.page.cardType?.slug || slug;
  const [card, catalog] = await Promise.all([loadCardRates(cardSlug), loadCatalogCards()]);
  // Keeps known brand pages alive (instead of 404) while the API is unreachable.
  const knownCard =
    catalog.cards.find((c) => [slug, cardSlug].some((s) => c.sellSlug === s || c.slug === s)) ?? null;
  return {
    landing,
    card: card.data,
    ratesAreStale: card.stale,
    catalogCards: catalog.cards,
    knownCard,
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = fixDuplicateSellSlug(params.slug);
  const { landing, card, knownCard } = await load(slug);
  const canonical = `/${slug}`;
  if (landing) {
    return {
      title: landing.page.metaTitle || landing.page.title,
      description: landing.page.metaDesc,
      alternates: { canonical },
      openGraph: { title: landing.page.metaTitle || landing.page.title, description: landing.page.metaDesc },
    };
  }
  const name = card?.card.name || knownCard?.name;
  if (name) {
    const desc = `Sell your ${name} gift card for USDT, Naira or Cedi at great rates.`;
    return {
      title: `Sell ${name} Gift Card`,
      description: desc,
      alternates: { canonical },
      openGraph: { title: `Sell ${name} Gift Card`, description: desc },
    };
  }
  return { title: "Not found" };
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function SlugPage({ params }: { params: { slug: string } }) {
  const fixedSlug = fixDuplicateSellSlug(params.slug);
  if (fixedSlug !== params.slug) redirect(`/${fixedSlug}`);

  const { landing, card, ratesAreStale, catalogCards, knownCard } = await load(fixedSlug);
  if (!landing && !card && !knownCard) notFound();

  const brand = card?.card ?? knownCard;
  const cardName = brand?.name || landing?.page.cardType?.name || "Gift Card";
  const title = landing?.page.title || `Sell ${cardName} Gift Card`;
  const bodyHtml = landing?.page.bodyHtml;
  const { leadHtml, restHtml } = bodyHtml ? splitArticleHtml(bodyHtml) : { leadHtml: "", restHtml: "" };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    serviceType: "Gift card exchange",
    areaServed: ["NG", "GH"],
    provider: { "@type": "Organization", name: "GiftCard4Sale", url: SITE },
    description:
      landing?.page.metaDesc ||
      `Sell your ${cardName} gift card for USDT, Naira or Cedi at great rates on GiftCard4Sale.`,
    url: `${SITE}/${fixedSlug}`,
  };

  const ratePanel = card ? (
    <CardRatePanel
      cardName={card.card.name}
      cardSellSlug={card.card.sellSlug}
      initialRates={card.rates}
      initialConfig={card.config}
      initialRateMeta={card.rateMeta}
      initialCurrencyMeta={card.currencyMeta}
      ratesAreStale={ratesAreStale}
    />
  ) : (
    <div className="card p-6">
      <h3 className="text-lg font-bold">Calculate your payout</h3>
      <p className="mt-2 text-sm text-slate-600">
        {knownCard
          ? `We're refreshing the ${cardName} rate right now. Check back in a few minutes, or `
          : "Browse our "}
        <a href="/cards" className="text-brand-700 hover:underline">
          gift card catalog
        </a>{" "}
        to find a card with live rates.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {card ? (
        <MetaViewContent
          contentName={card.card.name}
          contentIds={[card.card.slug]}
        />
      ) : null}

      <header className="flex items-center gap-4 border-b border-slate-100 pb-6">
        {brand && (
          <BrandLogo name={brand.name} slug={brand.slug} imageUrl={brand.imageUrl} className="h-14 w-14 shrink-0" />
        )}
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {landing?.page.metaDesc && (
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{landing.page.metaDesc}</p>
          )}
        </div>
      </header>

      <div className="mt-6">
        <GiftCardSearch cards={catalogCards} currentSellSlug={brand?.sellSlug ?? fixedSlug} />
      </div>

      {/* Mobile: rate calculator immediately after header for conversion */}
      <div className="mt-6 lg:hidden">{ratePanel}</div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        <div className="min-w-0">
          {leadHtml ? (
            <article className={articleProse} dangerouslySetInnerHTML={{ __html: leadHtml }} />
          ) : (
            <p className="text-slate-600 leading-relaxed">
              Sell your {cardName} gift card for USDT, Naira or Cedi. Calculate your exact payout, then open a trade.
              Only valid, unused cards are accepted.
            </p>
          )}

          {restHtml && (
            <article className={`${articleProse} mt-2`} dangerouslySetInnerHTML={{ __html: restHtml }} />
          )}
        </div>

        {/* Desktop: sticky rate panel stays visible while reading */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
              Live rate calculator
            </p>
            {ratePanel}
          </div>
        </aside>
      </div>
    </div>
  );
}
