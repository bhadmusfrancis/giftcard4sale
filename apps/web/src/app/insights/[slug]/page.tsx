import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiServer } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";

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

async function load(slug: string) {
  return apiServer<InsightResp>(`/insights/${slug}`);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await load(params.slug);
  if (!data?.post) return { title: "Insight not found" };
  return {
    title: data.post.metaTitle || data.post.title,
    description: data.post.metaDesc || data.post.excerpt,
    alternates: { canonical: `/insights/${params.slug}` },
    openGraph: {
      title: data.post.metaTitle || data.post.title,
      description: data.post.metaDesc || data.post.excerpt,
      url: `${SITE}/insights/${params.slug}`,
      type: "article",
      publishedTime: data.post.publishedAt,
    },
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default async function InsightArticlePage({ params }: { params: { slug: string } }) {
  const data = await load(params.slug);
  if (!data?.post) notFound();

  const { post, relatedSameDay } = data;
  const card = post.cardType;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDesc || post.excerpt,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: "GiftCard4Sale" },
    publisher: { "@type": "Organization", name: "GiftCard4Sale", url: SITE },
    mainEntityOfPage: `${SITE}/insights/${post.slug}`,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/insights" className="hover:text-brand-700">
          Insights
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{card?.name ?? "Article"}</span>
      </nav>

      <header className="mb-8 border-b border-slate-200 pb-8">
        <div className="mb-4 flex items-center gap-3">
          {card && (
            <BrandLogo name={card.name} slug={card.slug} imageUrl={card.imageUrl} className="h-11 w-11" />
          )}
          <div>
            <p className="text-sm font-medium text-brand-600">{card?.name}</p>
            <time className="text-sm text-slate-500" dateTime={post.batchDate}>
              {formatDate(post.batchDate)}
            </time>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-lg text-slate-600">{post.excerpt}</p>}
      </header>

      <article className={articleProse} dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

      {card && (
        <div className="mt-10 rounded-xl border border-brand-100 bg-brand-50/50 p-6">
          <h2 className="text-lg font-bold text-slate-900">Sell your {card.name}</h2>
          <p className="mt-2 text-slate-600">
            Compare live payout rates and trade unused balance for USDT, Naira, or Cedi.
          </p>
          <Link href={`/${card.sellSlug}`} className="btn-primary mt-4 inline-flex">
            View {card.name} rates
          </Link>
        </div>
      )}

      {relatedSameDay.length > 0 && (
        <aside className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">More from this edition</h2>
          <ul className="space-y-2">
            {relatedSameDay.map((r) => (
              <li key={r.slug}>
                <Link href={`/insights/${r.slug}`} className="text-brand-700 hover:text-brand-800">
                  {r.title}
                </Link>
                {r.cardType && <span className="ml-2 text-sm text-slate-500">({r.cardType.name})</span>}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </main>
  );
}
