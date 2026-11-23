import type { Metadata } from "next";
import { getInsightView, InsightArticleContent } from "@/components/InsightArticleContent";
import { SeoLanguageLinks } from "@/components/SeoLanguageLinks";
import { languageAlternates } from "@/lib/locale";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const view = await getInsightView(params.slug, null);
  if (!view) return { title: "Insight not found" };
  return {
    title: view.metaTitle,
    description: view.metaDesc,
    alternates: {
      canonical: `/insights/${params.slug}`,
      languages: languageAlternates(`/insights/${params.slug}`),
    },
    openGraph: {
      title: view.metaTitle,
      description: view.metaDesc,
      url: `${SITE}/insights/${params.slug}`,
      type: "article",
      publishedTime: view.post.publishedAt,
      modifiedTime: view.post.updatedAt,
    },
  };
}

export default async function InsightArticlePage({ params }: { params: { slug: string } }) {
  return (
    <>
      <InsightArticleContent slug={params.slug} />
      <SeoLanguageLinks />
    </>
  );
}
