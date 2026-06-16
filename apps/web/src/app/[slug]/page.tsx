import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiServer } from "@/lib/api";
import { RateCalculator } from "@/components/RateCalculator";
import { RequestRateForm } from "@/components/RequestRateForm";
import { BrandLogo } from "@/components/BrandLogo";

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

interface CardResp {
  card: { id: string; name: string; slug: string; sellSlug: string; description?: string; imageUrl?: string };
  rates: any[];
  config: any;
}

async function load(slug: string) {
  const landing = await apiServer<LandingResp>(`/landing/${slug}`);
  const cardSlug = landing?.page.cardType?.sellSlug || landing?.page.cardType?.slug || slug;
  const card = await apiServer<CardResp>(`/cards/${cardSlug}`);
  return { landing, card };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { landing, card } = await load(params.slug);
  const canonical = `/${params.slug}`;
  if (landing) {
    return {
      title: landing.page.metaTitle || landing.page.title,
      description: landing.page.metaDesc,
      alternates: { canonical },
      openGraph: { title: landing.page.metaTitle || landing.page.title, description: landing.page.metaDesc },
    };
  }
  if (card) {
    const desc = `Sell your ${card.card.name} gift card for USDT, Naira or Cedi at great rates.`;
    return {
      title: `Sell ${card.card.name} Gift Card`,
      description: desc,
      alternates: { canonical },
      openGraph: { title: `Sell ${card.card.name} Gift Card`, description: desc },
    };
  }
  return { title: "Not found" };
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function SlugPage({ params }: { params: { slug: string } }) {
  const { landing, card } = await load(params.slug);
  if (!landing && !card) notFound();

  const title = landing?.page.title || `Sell ${card?.card.name} Gift Card`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    serviceType: "Gift card exchange",
    areaServed: ["NG", "GH"],
    provider: { "@type": "Organization", name: "GiftCard4Sale", url: SITE },
    description:
      landing?.page.metaDesc ||
      `Sell your ${card?.card.name} gift card for USDT, Naira or Cedi at great rates on GiftCard4Sale.`,
    url: `${SITE}/${params.slug}`,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center gap-4">
        {card && (
          <BrandLogo
            name={card.card.name}
            slug={card.card.slug}
            imageUrl={card.card.imageUrl}
            className="h-14 w-14 shrink-0"
          />
        )}
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          {landing?.page.bodyHtml ? (
            <article
              className="prose prose-slate max-w-none [&_h3]:mt-6 [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_p]:my-3"
              dangerouslySetInnerHTML={{ __html: landing.page.bodyHtml }}
            />
          ) : (
            <p className="text-slate-600">
              Sell your {card?.card.name} gift card for USDT, Naira or Cedi. Calculate your exact payout, then open a
              trade. Only valid, unused cards are accepted.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {card && card.rates.length > 0 ? (
            <RateCalculator
              cardName={card.card.name}
              cardSellSlug={card.card.sellSlug}
              rates={card.rates}
              config={card.config}
            />
          ) : (
            <div className="card p-6">
              <h3 className="text-lg font-bold">Rate not listed yet</h3>
              <p className="mt-2 text-sm text-slate-600">
                We don&apos;t have a published rate for this card yet. Log in and request a rate and we&apos;ll get back
                to you quickly.
              </p>
            </div>
          )}

          {card && <RequestRateForm cardName={card.card.name} />}
        </div>
      </div>
    </div>
  );
}
