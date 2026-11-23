import type { Metadata } from "next";
import { getInsightView, InsightArticleContent } from "@/components/InsightArticleContent";
import { languageAlternates } from "@/lib/locale";

/** Localized insight article — ISR-cached like the other localized pages. */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  const view = await getInsightView(params.slug, params.lang);
  const canonical = `/${params.lang}/insights/${params.slug}`;
  if (!view) return { title: "Insight not found" };
  return {
    title: view.metaTitle,
    description: view.metaDesc,
    alternates: {
      canonical,
      languages: languageAlternates(`/insights/${params.slug}`),
    },
    openGraph: {
      title: view.metaTitle,
      description: view.metaDesc,
      url: `${SITE}${canonical}`,
      type: "article",
      publishedTime: view.post.publishedAt,
      modifiedTime: view.post.updatedAt,
    },
  };
}

export default async function LocalizedInsightArticlePage({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  return <InsightArticleContent slug={params.slug} lang={params.lang} />;
}
