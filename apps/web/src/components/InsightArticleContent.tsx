import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiServer } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { DomTranslator } from "@/components/DomTranslator";
import { getPageDict, makeTr, translateHtml } from "@/lib/seo/localized";
import { isSeoLocale, localizedPath } from "@/lib/locale";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface InsightResp {
  post: {
    slug: string;
    title: string;
    metaTitle?: string;
    metaDesc?: string;
    excerpt?: string;
    bodyHtml: string;
    batchDate: string;
    sourceUrls: string[];
    publishedAt: string;
    updatedAt?: string;
    cardType?: { id: string; name: string; slug: string; sellSlug: string; imageUrl?: string };
  };
  relatedSameDay: { slug: string; title: string; cardType?: { name: string; sellSlug: string } }[];
}

const articleProse =
  "prose prose-slate max-w-none " +
  "[&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-1.5 [&_p]:my-3 [&_p]:leading-relaxed " +
  "[&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-brand-800";

type Tr = (text: string) => string;

export interface InsightView {
  post: InsightResp["post"];
  relatedSameDay: InsightResp["relatedSameDay"];
  tr: Tr;
  title: string;
  metaTitle: string;
  metaDesc?: string;
  excerpt?: string;
  bodyHtml: string;
  relatedTitles: Map<string, string>;
}

/** Post + its translations, resolved once per (slug, lang) per request. */
export const getInsightView = cache(
  async (slug: string, lang: string | null): Promise<InsightView | null> => {
    const data = await apiServer<InsightResp>(`/insights/${slug}`);
    if (!data?.post) return null;
    const { post, relatedSameDay } = data;
    const card = post.cardType;
    const metaTitle = post.metaTitle || post.title;
    const metaDesc = post.metaDesc || post.excerpt;

    const localized = !!lang && isSeoLocale(lang);
    if (!localized) {
      return {
        post,
        relatedSameDay,
        tr: (s) => s,
        title: post.title,
        metaTitle,
        metaDesc,
        excerpt: post.excerpt,
        bodyHtml: post.bodyHtml,
        relatedTitles: new Map(),
      };
    }

    const strings = [
      post.title,
      metaTitle,
      ...(metaDesc ? [metaDesc] : []),
      ...(post.excerpt ? [post.excerpt] : []),
      "Insights",
      "Article",
      ...(card ? [`Sell your ${card.name}`, `View ${card.name} rates`] : []),
      "Compare live payout rates and trade unused balance for USDT, Naira, or Cedi.",
      "More from this edition",
      ...relatedSameDay.map((r) => r.title),
    ];

    const dict = await getPageDict(lang!, strings);
    const tr = makeTr(dict);
    const bodyHtml = await translateHtml(lang!, post.bodyHtml);
    const relatedTitles = new Map<string, string>();
    for (const r of relatedSameDay) {
      const t = tr(r.title);
      if (t !== r.title) relatedTitles.set(r.slug, t);
    }

    return {
      post,
      relatedSameDay,
      tr,
      title: tr(post.title),
      metaTitle: tr(metaTitle),
      metaDesc: metaDesc ? tr(metaDesc) : undefined,
      excerpt: post.excerpt ? tr(post.excerpt) : undefined,
      bodyHtml,
      relatedTitles,
    };
  }
);

function formatDate(iso: string, locale = "en-US"): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00Z");
  return d.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export async function InsightArticleContent({
  slug,
  lang,
}: {
  slug: string;
  lang?: string;
}) {
  const view = await getInsightView(slug, lang ?? null);
  if (!view) notFound();

  const { post, relatedSameDay, tr, title, metaDesc, excerpt, bodyHtml, relatedTitles } = view;
  const card = post.cardType;
  const locale = lang || "en-US";
  const insightsPath = lang ? localizedPath(lang, "/insights") : "/insights";
  const postPath = (s: string) =>
    lang ? localizedPath(lang, `/insights/${s}`) : `/insights/${s}`;
  const cardPath = card
    ? lang
      ? localizedPath(lang, `/${card.sellSlug}`)
      : `/${card.sellSlug}`
    : "#";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: metaDesc,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    articleSection: card?.name,
    author: { "@type": "Organization", name: "GiftCard4Sale" },
    publisher: { "@type": "Organization", name: "GiftCard4Sale", url: SITE },
    mainEntityOfPage: `${SITE}${postPath(post.slug)}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Insights", item: `${SITE}${insightsPath}` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE}${postPath(post.slug)}` },
    ],
  };

  const inner = (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className="mb-6 text-sm text-slate-500">
        <Link href={insightsPath} className="hover:text-brand-700">
          {tr("Insights")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{card?.name ?? tr("Article")}</span>
      </nav>

      <header className="mb-8 border-b border-slate-200 pb-8">
        <div className="mb-4 flex items-center gap-3">
          {card && (
            <BrandLogo name={card.name} slug={card.slug} imageUrl={card.imageUrl} className="h-11 w-11" />
          )}
          <div>
            <p className="text-sm font-medium text-brand-600">{card?.name}</p>
            <time className="text-sm text-slate-500" dateTime={post.batchDate}>
              {formatDate(post.batchDate, locale)}
            </time>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {excerpt && <p className="mt-4 text-lg text-slate-600">{excerpt}</p>}
      </header>

      <article className={articleProse} dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      {card && (
        <div className="mt-10 rounded-xl border border-brand-100 bg-brand-50/50 p-6">
          <h2 className="text-lg font-bold text-slate-900">{tr(`Sell your ${card.name}`)}</h2>
          <p className="mt-2 text-slate-600">
            {tr("Compare live payout rates and trade unused balance for USDT, Naira, or Cedi.")}
          </p>
          <Link href={cardPath} className="btn-primary mt-4 inline-flex">
            {tr(`View ${card.name} rates`)}
          </Link>
        </div>
      )}

      {relatedSameDay.length > 0 && (
        <aside className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">{tr("More from this edition")}</h2>
          <ul className="space-y-2">
            {relatedSameDay.map((r) => (
              <li key={r.slug}>
                <Link href={postPath(r.slug)} className="text-brand-700 hover:text-brand-800">
                  {relatedTitles.get(r.slug) ?? r.title}
                </Link>
                {r.cardType && <span className="ml-2 text-sm text-slate-500">({r.cardType.name})</span>}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </main>
  );

  return lang ? inner : <DomTranslator>{inner}</DomTranslator>;
}
