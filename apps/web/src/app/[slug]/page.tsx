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

interface FaqItem {
  q: string;
  a: string;
}

function buildCardFaqs(cardName: string): FaqItem[] {
  return [
    {
      q: `How much is a ${cardName} gift card worth today?`,
      a: `The live rate calculator on this page shows the current ${cardName} payout. Rates update throughout the day — pick your card's country and enter the amount to see the exact figure before you trade.`,
    },
    {
      q: `How do I sell my ${cardName} gift card?`,
      a: "Create a free account, start a trade from this page, then upload a photo of the card or paste the e-code. We verify the balance and credit your wallet once approved.",
    },
    {
      q: "How fast do I get paid?",
      a: "Your GiftCard4Sale wallet is credited as soon as the trade is approved — usually within minutes of verification. Withdraw anytime in USDT, Naira or Cedis.",
    },
    {
      q: `Can I sell a physical ${cardName} card or only e-codes?`,
      a: "Both are accepted. Physical cards just need clear photos of the front and back; e-codes can be pasted directly into the trade form.",
    },
    {
      q: "Is it safe to sell gift cards online?",
      a: "Yes — trades run inside your own GiftCard4Sale account and we never ask for issuer passwords or bank logins. Only submit valid cards you legally own.",
    },
  ];
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
    const title = `Sell ${name} Gift Card for Naira, Cedi or USDT`;
    const desc = `Sell your ${name} gift card instantly on GiftCard4Sale. See today's live rate, calculate your payout and get paid in Naira, Cedis or USDT.`;
    return {
      title,
      description: desc,
      alternates: { canonical },
      openGraph: { title, description: desc },
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
  const isCvs = brand?.name?.toLowerCase().includes("cvs") ?? false;
  const isXbox =
    (brand?.name?.toLowerCase().includes("xbox") ?? false) ||
    brand?.slug === "xbox" ||
    brand?.slug === "x-box";
  const cardName = brand?.name || landing?.page.cardType?.name || "Gift Card";
  const title = landing?.page.title || `Sell ${cardName} Gift Card`;
  const bodyHtml = landing?.page.bodyHtml;
  const { leadHtml, restHtml } = bodyHtml ? splitArticleHtml(bodyHtml) : { leadHtml: "", restHtml: "" };

  const faqs = buildCardFaqs(cardName);

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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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

      {isCvs && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">
            Cards with numbers starting with these digits are not acceptable (third-party cards — we can't use them):
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {[
              "61019031",
              "61019043",
              "61019030",
              "61019044",
              "61019042",
              "61019016",
              "61019011",
            ].map((prefix) => (
              <li key={prefix}>{prefix}</li>
            ))}
          </ul>
        </div>
      )}

      {isXbox && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Only Xbox gift cards are accepted.</p>
          <p className="mt-1">
            Xbox/Microsoft PC Game Pass and membership or subscription cards are <strong>not</strong> acceptable —
            please do not submit them.
          </p>
        </div>
      )}

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
            <article className={articleProse}>
              <p>
                Sell your {cardName} gift card for USDT, Naira or Cedi. Calculate your exact payout with the live rate
                calculator, then open a trade. Only valid, unused cards are accepted.
              </p>
              <h2>How to sell your {cardName} gift card</h2>
              <ol>
                <li>Create a free GiftCard4Sale account — it takes under a minute.</li>
                <li>Open a trade for {cardName}, choose your card&apos;s country, and enter the amount.</li>
                <li>Upload a clear photo of the card or paste the e-code, then submit.</li>
                <li>Once verified, your wallet is credited. Withdraw in USDT, Naira or Cedis.</li>
              </ol>
              <h2>{cardName} gift card rate today</h2>
              <p>
                {cardName} rates move with market demand and are refreshed throughout the day. The calculator on this
                page always shows the current payout for your card&apos;s country and denomination — what you see is what
                you get, with no hidden fees.
              </p>
            </article>
          )}

          {restHtml && (
            <article className={`${articleProse} mt-2`} dangerouslySetInnerHTML={{ __html: restHtml }} />
          )}

          <section className="mt-10">
            <h2 className="text-xl font-bold">Frequently asked questions</h2>
            <div className="faq-list mt-4 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="faq-item rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <summary className="cursor-pointer font-medium text-slate-800">{f.q}</summary>
                  <p className="mt-2 text-sm text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
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
