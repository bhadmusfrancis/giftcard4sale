import type { Metadata } from "next";
import { InsightsIndexContent } from "@/components/InsightsIndexContent";
import { getPageDict, makeTr } from "@/lib/seo/localized";
import { languageAlternates, localizedPath } from "@/lib/locale";

export const revalidate = 3600;

const META_TITLE = "Gift Card Insights & News | GiftCard4Sale";
const META_DESC =
  "Daily gift card news, trends, and market briefs researched from official websites and social channels across our active catalog.";

const STRINGS = [META_TITLE, META_DESC] as const;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  return {
    title: tr(META_TITLE),
    description: tr(META_DESC),
    alternates: {
      canonical: localizedPath(params.lang, "/insights"),
      languages: languageAlternates("/insights"),
    },
  };
}

export default async function LocalizedInsightsPage({
  params,
}: {
  params: { lang: string };
}) {
  return <InsightsIndexContent lang={params.lang} />;
}
