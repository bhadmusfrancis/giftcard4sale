import { cache } from "react";
import Link from "next/link";
import { apiServer } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { DomTranslator } from "@/components/DomTranslator";
import { getPageDict, makeTr } from "@/lib/seo/localized";
import { isSeoLocale, localizedPath } from "@/lib/locale";

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

type InsightListPost = InsightListResp["posts"][number];
type Tr = (text: string) => string;

function formatBatchLabel(iso: string, locale = "en-US"): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function monthLabel(iso: string, locale = "en-US"): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
}

function dayLabel(iso: string, locale = "en-US"): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Monday-start week key (YYYY-MM-DD of the week's Monday). */
function weekStartKey(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function weekLabel(weekStartIso: string, locale = "en-US"): string {
  const start = new Date(weekStartIso + "T12:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date, year: boolean) =>
    d.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      ...(year ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
  return `Week of ${fmt(start, start.getUTCFullYear() !== end.getUTCFullYear())} – ${fmt(end, true)}`;
}

interface InsightsData {
  list: InsightListResp | null;
  batches: BatchesResp | null;
}

async function loadInsightsData(): Promise<InsightsData> {
  const [list, batches] = await Promise.all([
    apiServer<InsightListResp>("/insights?limit=1000"),
    apiServer<BatchesResp>("/insights/batches"),
  ]);
  return { list, batches };
}

export interface InsightsView {
  posts: InsightListPost[];
  latestBatch?: string;
  featured: InsightListPost[];
  thisWeek: InsightListPost[];
  byMonth: Map<string, Map<string, InsightListPost[]>>;
  tr: Tr;
  /** Translated post titles keyed by slug (featured + this week only). */
  titles: Map<string, string>;
  /** Translated excerpts keyed by slug (featured only). */
  excerpts: Map<string, string>;
}

/**
 * Shared data + translations for the insights index. Only current posts get
 * translated titles — the ~1000-post archive stays in English intentionally.
 */
export const getInsightsView = cache(async (lang: string | null): Promise<InsightsView> => {
  const { list, batches } = await loadInsightsData();
  const posts = list?.posts ?? [];
  const latestBatch = batches?.batches?.[0]?.batchDate;
  const featured = latestBatch ? posts.filter((p) => p.batchDate === latestBatch) : posts.slice(0, 7);

  const thisWeekKey = weekStartKey(new Date().toISOString().slice(0, 10));
  const rest = posts.filter((p) => p.batchDate !== latestBatch);
  const thisWeek = rest.filter((p) => weekStartKey(p.batchDate) === thisWeekKey);
  const archive = rest.filter((p) => weekStartKey(p.batchDate) !== thisWeekKey);

  const byMonth = new Map<string, Map<string, InsightListPost[]>>();
  for (const p of archive) {
    const month = monthLabel(p.batchDate, "en-US");
    const week = weekStartKey(p.batchDate);
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const weeks = byMonth.get(month)!;
    const arr = weeks.get(week) ?? [];
    arr.push(p);
    weeks.set(week, arr);
  }

  const localized = !!lang && isSeoLocale(lang);
  const strings: string[] = localized
    ? [
        "Insights",
        "Gift Card News & Market Briefs",
        "Each day we research gift cards from official websites and social channels — covering product launches, seasonal campaigns, and trends that matter if you hold or trade stored-value balance.",
        "Today's picks",
        "Earlier this week",
        "Archive",
        "Read insight →",
        "Gift card",
        "Insights are published daily. Check back soon for the first batch.",
        ...featured.flatMap((p) => [p.title, p.excerpt || p.metaDesc || ""].filter(Boolean)),
        ...thisWeek.map((p) => p.title),
      ]
    : [];

  const dict = localized ? await getPageDict(lang!, strings) : {};
  const tr = makeTr(dict);
  const titles = new Map<string, string>();
  const excerpts = new Map<string, string>();
  for (const p of [...featured, ...thisWeek]) {
    const t = tr(p.title);
    if (t !== p.title) titles.set(p.slug, t);
  }
  for (const p of featured) {
    const src = p.excerpt || p.metaDesc;
    if (src) {
      const t = tr(src);
      if (t !== src) excerpts.set(p.slug, t);
    }
  }

  return { posts, latestBatch, featured, thisWeek, byMonth, tr, titles, excerpts };
});

function PostRow({
  post,
  lang,
  titles,
  locale,
}: {
  post: InsightListPost;
  lang?: string;
  titles: Map<string, string>;
  locale: string;
}) {
  const href = lang
    ? localizedPath(lang, `/insights/${post.slug}`)
    : `/insights/${post.slug}`;
  return (
    <li>
      <Link
        href={href}
        className="flex flex-col gap-1 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="w-28 shrink-0 text-sm text-slate-400">{dayLabel(post.batchDate, locale)}</span>
        <span className="flex-1 font-medium text-slate-900">{titles.get(post.slug) ?? post.title}</span>
        <span className="text-sm text-slate-500">{post.cardType?.name}</span>
      </Link>
    </li>
  );
}

export async function InsightsIndexContent({ lang }: { lang?: string }) {
  const view = await getInsightsView(lang ?? null);
  const { posts, latestBatch, featured, thisWeek, byMonth, tr, titles, excerpts } = view;
  const locale = lang || "en-US";
  const postHref = (slug: string) =>
    lang ? localizedPath(lang, `/insights/${slug}`) : `/insights/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Gift Card Insights & News",
    description:
      "Daily gift card news, trends, and market briefs researched from official websites and social channels.",
    url: `${SITE}${lang ? localizedPath(lang, "/insights") : "/insights"}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.slice(0, 100).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/insights/${p.slug}`,
        name: p.title,
      })),
    },
  };

  const inner = (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{tr("Insights")}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {tr("Gift Card News & Market Briefs")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          {tr("Each day we research gift cards from official websites and social channels — covering product launches, seasonal campaigns, and trends that matter if you hold or trade stored-value balance.")}
        </p>
      </header>

      {featured.length > 0 && (
        <section className="mb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900">{tr("Today's picks")}</h2>
            {latestBatch && (
              <span className="text-sm text-slate-500">{formatBatchLabel(latestBatch, locale)}</span>
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
                    {post.cardType?.name ?? tr("Gift card")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
                  <Link href={postHref(post.slug)}>{titles.get(post.slug) ?? post.title}</Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                  {excerpts.get(post.slug) ?? post.excerpt ?? post.metaDesc}
                </p>
                <Link
                  href={postHref(post.slug)}
                  className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  {tr("Read insight →")}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {thisWeek.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold text-slate-900">{tr("Earlier this week")}</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {thisWeek.map((post) => (
              <PostRow key={post.slug} post={post} lang={lang} titles={titles} locale={locale} />
            ))}
          </ul>
        </section>
      )}

      {byMonth.size > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-bold text-slate-900">{tr("Archive")}</h2>
          {/* Post titles stay in English — translating ~1000 archive headlines on
              every page view would be needlessly expensive. */}
          <div className="space-y-10" data-i18n-skip>
            {[...byMonth.entries()].map(([month, weeks]) => (
              <div key={month}>
                <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {month}
                </h3>
                <div className="space-y-6">
                  {[...weeks.entries()].map(([week, weekPosts]) => (
                    <div key={week}>
                      <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {weekLabel(week, locale)}
                      </h4>
                      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                        {weekPosts.map((post) => (
                          <PostRow key={post.slug} post={post} lang={lang} titles={titles} locale={locale} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {posts.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-600">
          {tr("Insights are published daily. Check back soon for the first batch.")}
        </p>
      )}
    </main>
  );

  return lang ? inner : <DomTranslator>{inner}</DomTranslator>;
}
