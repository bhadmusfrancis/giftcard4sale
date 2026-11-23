import type { Metadata } from "next";
import { InsightsIndexContent } from "@/components/InsightsIndexContent";
import { SeoLanguageLinks } from "@/components/SeoLanguageLinks";
import { languageAlternates } from "@/lib/locale";

export const revalidate = 1800;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Gift Card Insights & News | GiftCard4Sale",
  description:
    "Daily gift card news, trends, and market briefs researched from official websites and social channels across our active catalog.",
  keywords: [
    "gift card news",
    "gift card market trends",
    "sell gift cards",
    "gift card rates",
    "gift card insights",
  ],
  alternates: { canonical: "/insights", languages: languageAlternates("/insights") },
  openGraph: {
    title: "Gift Card Insights & News",
    description: "Daily researched briefs on trending gift cards — news, products, and market context.",
    url: `${SITE}/insights`,
  },
};

export default async function InsightsPage() {
  return (
    <>
      <InsightsIndexContent />
      <SeoLanguageLinks />
    </>
  );
}
