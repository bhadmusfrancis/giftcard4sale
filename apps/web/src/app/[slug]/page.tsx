import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { fixDuplicateSellSlug } from "@gc4s/shared";
import { getSlugView, SlugPageContent } from "@/components/SlugPageContent";
import { SeoLanguageLinks } from "@/components/SeoLanguageLinks";
import { languageAlternates } from "@/lib/locale";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = fixDuplicateSellSlug(params.slug);
  const view = await getSlugView(slug, null);
  const canonical = `/${slug}`;
  if (!view) return { title: "Not found" };
  return {
    title: view.metaTitle,
    description: view.metaDesc,
    alternates: { canonical, languages: languageAlternates(canonical) },
    openGraph: { title: view.metaTitle, description: view.metaDesc },
  };
}

export default async function SlugPage({ params }: { params: { slug: string } }) {
  const fixedSlug = fixDuplicateSellSlug(params.slug);
  if (fixedSlug !== params.slug) redirect(`/${fixedSlug}`);
  return (
    <>
      <SlugPageContent fixedSlug={fixedSlug} />
      <SeoLanguageLinks />
    </>
  );
}
