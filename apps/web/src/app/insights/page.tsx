import Link from "next/link";
import type { Metadata } from "next";
import { apiServer } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";

export const revalidate = 1800;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface InsightListResp {
  posts: {
    slug: string;
    title: string;
    excerpt?: string;
    metaDesc?: string;
    batchDate: string;
    publishedAt: string;
    cardType?: { name: string; slug: string; sellSlug: string; imageUrl?: string };
  }[];
  total: number;
}

interface BatchesResp {
  batches: { batchDate: string; count: number }[];
}

export const metadata: Metadata = {
  title: "Gift Card Insights & News | GiftCard4Sale",
  description:
    "Daily gift card news, trends, and market briefs researched from official websites and social channels across our active catalog.",
  alternates: { canonical: "/insights" },
  openGraph: {
    title: "Gift Card Insights & News",
    description: "Daily researched briefs on trending gift cards — news, products, and market context.",
    url: `${SITE}/insights`,
  },
};

function formatBatchLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default async function InsightsPage() {
  const [list, batches] = await Promise.all([
    apiServer<InsightListResp>("/insights?limit=28"),
    apiServer<BatchesResp>("/insights/batches"),
  ]);

  const posts = list?.posts ?? [];
  const latestBatch = batches?.batches?.[0]?.batchDate;
  const featured = latestBatch ? posts.filter((p) => p.batchDate === latestBatch) : posts.slice(0, 7);
  const archive = latestBatch ? posts.filter((p) => p.batchDate !== latestBatch) : posts.slice(7);

  const byBatch = new Map<string, typeof posts>();
  for (const p of archive) {
    const arr = byBatch.get(p.batchDate) ?? [];
    arr.push(p);
    byBatch.set(p.batchDate, arr);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Insights</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Gift Card News &amp; Market Briefs
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Each day we research gift cards from official websites and social channels — covering product
          launches, seasonal campaigns, and trends that matter if you hold or trade stored-value balance.
        </p>
      </header>

      {featured.length > 0 && (
        <section className="mb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900">Today&apos;s picks</h2>
            {latestBatch && (
              <span className="text-sm text-slate-500">{formatBatchLabel(latestBatch)}</span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((post) => (
              <article
                key={post.slug}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3">
                  {post.cardType && (
                    <BrandLogo
                      name={post.cardType.name}
                      slug={post.cardType.slug}
                      imageUrl={post.cardType.imageUrl}
                      className="h-9 w-9"
                    />
                  )}
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {post.cardType?.name ?? "Gift card"}
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
                  <Link href={`/insights/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                  {post.excerpt || post.metaDesc}
                </p>
                <Link
                  href={`/insights/${post.slug}`}
                  className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Read insight →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {byBatch.size > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-bold text-slate-900">Archive</h2>
          <div className="space-y-8">
            {[...byBatch.entries()].map(([batchDate, batchPosts]) => (
              <div key={batchDate}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {formatBatchLabel(batchDate)}
                </h3>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {batchPosts.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={`/insights/${post.slug}`}
                        className="flex flex-col gap-1 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium text-slate-900">{post.title}</span>
                        <span className="text-sm text-slate-500">{post.cardType?.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {posts.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-600">
          Insights are published daily. Check back soon for the first batch.
        </p>
      )}
    </main>
  );
}
