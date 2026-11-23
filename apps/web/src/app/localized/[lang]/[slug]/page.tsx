import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { fixDuplicateSellSlug } from "@gc4s/shared";
import { getSlugView, SlugPageContent } from "@/components/SlugPageContent";
import { languageAlternates } from "@/lib/locale";

/** Localized card/landing detail — ISR-cached like the other localized pages. */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  const slug = fixDuplicateSellSlug(params.slug);
  const view = await getSlugView(slug, params.lang);
  const canonical = `/${params.lang}/${slug}`;
  if (!view) return { title: "Not found" };
  return {
    title: view.metaTitle,
    description: view.metaDesc,
    alternates: { canonical, languages: languageAlternates(`/${slug}`) },
    openGraph: { title: view.metaTitle, description: view.metaDesc },
  };
}

export default async function LocalizedSlugPage({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  const fixedSlug = fixDuplicateSellSlug(params.slug);
  if (fixedSlug !== params.slug) redirect(`/${params.lang}/${fixedSlug}`);
  return <SlugPageContent fixedSlug={fixedSlug} lang={params.lang} />;
}
