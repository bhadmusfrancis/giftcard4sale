export interface GiftCardProfile {
  /** Canonical card slug (matches CardType.slug). */
  slug: string;
  category: "retail" | "gaming" | "prepaid" | "food" | "fashion" | "travel" | "digital" | "marketplace";
  /** Display name for the issuing brand (may differ from CardType.name). */
  brand: string;
  /** 2–3 sentence hook unique to this brand. */
  hook: string;
  /** ~120+ words about the issuing company and the card program. */
  about: string;
  /** Step-by-step balance check instructions (unique per brand). */
  balanceCheck: {
    intro: string;
    steps: string[];
    tip?: string;
  };
  /** ~100+ words on why shoppers seek discounted cards. */
  whyWanted: string;
  /** Practical redemption or usage notes. */
  redemptionNotes: string;
  faq: { q: string; a: string }[];
  /** Extra SEO keywords woven naturally into meta description. */
  metaKeywords: string[];
}

export interface GeneratedArticle {
  title: string;
  metaTitle: string;
  metaDesc: string;
  bodyHtml: string;
  wordCount: number;
}
