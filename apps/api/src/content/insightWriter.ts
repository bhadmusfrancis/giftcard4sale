import { env } from "../env";
import type { GiftCardProfile } from "./types";
import type { ResearchSnippet } from "../services/insights/research";
import { extLink, h2, h3, normalizeBodyHtml, p, ul } from "./insightHtml";

export interface GeneratedInsight {
  title: string;
  metaTitle: string;
  metaDesc: string;
  excerpt: string;
  bodyHtml: string;
  sourceUrls: string[];
}

const MONTH_TOPICS = [
  "early-year promotions and loyalty refreshes",
  "spring product launches and seasonal campaigns",
  "mid-year sales events and membership perks",
  "back-to-school and autumn shopping momentum",
  "holiday gifting previews and year-end reward programs",
  "winter clearance and new-year digital storefront updates",
];

function monthTopic(): string {
  return MONTH_TOPICS[new Date().getMonth() % MONTH_TOPICS.length];
}

function pickVariant(slug: string, date: Date, salt: string, count: number): number {
  const seed = `${slug}-${date.toISOString().slice(0, 10)}-${salt}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % count;
}

const ANGLE_INTROS = [
  (brand: string) =>
    `Industry watchers are tracking how ${brand} is positioning its prepaid products as flexible spending tools for both everyday shoppers and digital-first audiences.`,
  (brand: string) =>
    `Retail analysts note that ${brand} continues to refine how customers discover, purchase, and redeem stored-value products across web and mobile channels.`,
  (brand: string) =>
    `Consumer spending data suggests ${brand} gift balances remain a practical bridge between promotional rewards and discretionary purchases.`,
  (brand: string) =>
    `Brand strategists highlight ${brand}'s ongoing effort to connect loyalty, gifting, and e-commerce in a single prepaid experience.`,
  (brand: string) =>
    `Market commentators observe steady demand for ${brand} stored-value products, particularly where regional catalogs and subscription bundles overlap.`,
  (brand: string) =>
    `Payment researchers point to ${brand} as a bellwether for how major issuers blend physical retail, e-commerce, and mobile wallet redemption.`,
  (brand: string) =>
    `Trade desks watching secondary markets report that ${brand} balances move quickly when promotional windows open or catalog refreshes land.`,
];

const OPENING_WRAPPERS = [
  (angle: string, cardName: string) =>
    `<strong>${angle}</strong> Below is a concise briefing on <strong>${cardName}</strong>, drawn from the issuer's public web and social channels.`,
  (angle: string, cardName: string) =>
    `<strong>${angle}</strong> This report centers on <strong>${cardName}</strong> and what official sources are signaling right now.`,
  (angle: string, cardName: string) =>
    `<strong>${angle}</strong> We reviewed issuer-published material to assemble this snapshot for <strong>${cardName}</strong> holders and traders.`,
  (angle: string, cardName: string) =>
    `<strong>${angle}</strong> The following notes cover <strong>${cardName}</strong> — compiled from brand websites, newsrooms, and verified social feeds.`,
  (angle: string, cardName: string) =>
    `<strong>${angle}</strong> Here is today's editorial read on <strong>${cardName}</strong>, based solely on publicly available issuer communications.`,
];

const TREND_HEADINGS = [
  "What's moving in the market",
  "Recent signals worth watching",
  "Headlines and market pulse",
  "This week's notable developments",
  "Trends shaping card value",
];

const ABOUT_HEADINGS = [
  (brand: string) => `About ${brand} stored-value products`,
  (brand: string) => `${brand} prepaid program at a glance`,
  (brand: string) => `How ${brand} gift balances work`,
  (brand: string) => `${brand} card program overview`,
  (brand: string) => `Understanding ${brand} prepaid credit`,
];

const BALANCE_HEADINGS = [
  "Redemption and balance checks",
  "Checking your balance",
  "Balance lookup and redemption",
  "How to verify remaining credit",
  "Practical redemption steps",
];

const DEMAND_HEADINGS = [
  "Why demand stays elevated",
  "What drives secondary interest",
  "Why traders watch this brand",
  "Demand factors to know",
  "Why balances change hands",
];

const TRADE_HEADINGS = [
  "Trading unused balance",
  "Converting credit you won't spend",
  "Liquidating leftover balance",
  "Options for unused credit",
  "Turning balance into cash",
];

const TRADE_PARAS = [
  (cardName: string, sellSlug: string) =>
    `Leftover ${cardName} credit can be converted through a verified marketplace into USDT, Naira, or Cedi. ` +
    `Review live payout quotes on our ${extLink(`/${sellSlug}`, `${cardName} rate page`)} before you submit.`,
  (cardName: string, sellSlug: string) =>
    `When you do not plan to spend a ${cardName} balance, a regulated exchange offers a path to USDT, Naira, or Cedi liquidity. ` +
    `Start with today's rates on the ${extLink(`/${sellSlug}`, `${cardName} calculator`)}.`,
  (cardName: string, sellSlug: string) =>
    `Unused ${cardName} funds are often listed on secondary markets. ` +
    `Compare current buy-side pricing via our ${extLink(`/${sellSlug}`, `${cardName} payout page`)} prior to opening a trade.`,
  (cardName: string, sellSlug: string) =>
    `Holders who prefer cash over in-store spending can liquidate ${cardName} credit for USDT, Naira, or Cedi. ` +
    `Check the ${extLink(`/${sellSlug}`, `live ${cardName} quote`)} to see what your denomination earns today.`,
  (cardName: string, sellSlug: string) =>
    `Rather than letting ${cardName} credit sit idle, many sellers route balances through GiftCard4Sale for USDT, Naira, or Cedi payout. ` +
    `Visit the ${extLink(`/${sellSlug}`, `${cardName} rate tool`)} for an instant estimate.`,
];

const SOCIAL_NOTES = [
  (brand: string, links: string) =>
    `${brand} posts limited-time offers and product drops on social channels before they hit mainstream press. ` +
    `Monitoring ${links} can reveal promotions that shift how buyers price unused balance.`,
  (brand: string, links: string) =>
    `Issuer social feeds for ${brand} frequently announce flash sales, bundle deals, and catalog updates ahead of email campaigns. ` +
    `Follow ${links} if you track resale spreads closely.`,
  (brand: string, links: string) =>
    `Brand-owned accounts for ${brand} are often the first place seasonal campaigns surface. ` +
    `Watch ${links} for cues that affect near-term demand for outstanding credit.`,
  (brand: string, links: string) =>
    `${brand} uses social platforms to tease new partnerships and reward events that can move secondary-market appetite. ` +
    `Keeping an eye on ${links} helps holders time trades.`,
];

const EXCERPT_FALLBACKS = [
  (angle: string, cardName: string) => `${angle.slice(0, 120)} Key takeaways for ${cardName} holders.`,
  (angle: string, cardName: string) => `A quick read on ${cardName}: ${angle.slice(0, 100)}…`,
  (_angle: string, cardName: string, brand: string) =>
    `${brand} gift card update — what official channels say and what it means if you hold ${cardName} credit.`,
  (_angle: string, cardName: string) =>
    `Official-source briefing on ${cardName}: trends, redemption notes, and market context for this week.`,
];

const META_DESC_TEMPLATES = [
  (brand: string, monthYear: string, keywords: string) =>
    `${brand} gift card briefing for ${monthYear}: official updates, resale context, and balance tips. ${keywords}.`,
  (brand: string, monthYear: string, keywords: string) =>
    `What ${brand} prepaid holders should know in ${monthYear} — trends, redemption, and trading context. ${keywords}.`,
  (brand: string, monthYear: string, keywords: string) =>
    `${monthYear} ${brand} stored-value roundup: issuer news, seasonal campaigns, and market notes. ${keywords}.`,
];

const FALLBACK_TOPIC_LINES = [
  (topic: string, brand: string) =>
    `With ${topic} underway, ${brand} shoppers often verify balances before spending or listing unused credit.`,
  (topic: string, brand: string) =>
    `As ${topic} pick up, ${brand} holders tend to recheck redemption rules and remaining face value.`,
  (topic: string, brand: string) =>
    `During ${topic}, ${brand} buyers watch for issuer promos that can widen or narrow secondary-market spreads.`,
];

function sourcesSection(snippets: ResearchSnippet[], slug: string, batchDate: Date): { html: string; urls: string[] } {
  const ok = snippets.filter((s) => s.ok);
  const urls = ok.map((s) => s.url);
  const heading = ["Sources consulted", "References", "Official sources", "Where we looked"][pickVariant(slug, batchDate, "sources", 4)];
  if (ok.length === 0) {
    return {
      html: p("Official brand channels were consulted for this briefing; verify announcements on the issuer's website before making purchase decisions."),
      urls: snippets.map((s) => s.url),
    };
  }
  const items = ok.map((s) => {
    const detail = s.description ? ` — ${s.description.slice(0, 180)}${s.description.length > 180 ? "…" : ""}` : "";
    return `${extLink(s.url, s.label)}${s.title ? `: <em>${s.title}</em>` : ""}${detail}`;
  });
  return { html: h3(heading) + ul(items), urls };
}

function buildFallbackInsight(
  cardName: string,
  profile: GiftCardProfile,
  snippets: ResearchSnippet[],
  sellSlug: string,
  batchDate: Date
): GeneratedInsight {
  const brand = profile.brand;
  const angle = ANGLE_INTROS[pickVariant(profile.slug, batchDate, "angle", ANGLE_INTROS.length)](brand);
  const topic = monthTopic();
  const news = snippets.find((s) => s.ok && s.label === "Newsroom");
  const site = snippets.find((s) => s.ok && (s.label === "Official website" || s.label === "Gift cards"));
  const social = snippets.filter((s) => s.ok && /X|Facebook|Instagram/.test(s.label));
  const monthYear = batchDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const headline =
    news?.title?.slice(0, 90) ||
    site?.title?.slice(0, 90) ||
    `${brand} Gift Card Market Brief — ${batchDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const title = `${brand} Insights: ${headline.replace(new RegExp(`^${brand}\\s*`, "i"), "").trim() || "What Shoppers Should Know"}`;
  const metaTitle = `${brand} Gift Card News & Trends | GiftCard4Sale Insights`;
  const metaDesc = META_DESC_TEMPLATES[pickVariant(profile.slug, batchDate, "meta", META_DESC_TEMPLATES.length)](
    brand,
    monthYear,
    profile.metaKeywords.slice(0, 2).join(", ")
  );

  const excerpt =
    news?.description?.slice(0, 220) ||
    EXCERPT_FALLBACKS[pickVariant(profile.slug, batchDate, "excerpt", EXCERPT_FALLBACKS.length)](angle, cardName, brand);

  const trendBullets: string[] = [];
  if (news?.description) trendBullets.push(news.description.slice(0, 280));
  if (site?.description && site.description !== news?.description) {
    trendBullets.push(site.description.slice(0, 280));
  }
  if (trendBullets.length === 0) {
    trendBullets.push(profile.hook);
    trendBullets.push(
      FALLBACK_TOPIC_LINES[pickVariant(profile.slug, batchDate, "topic", FALLBACK_TOPIC_LINES.length)](topic, brand)
    );
  }

  const socialNote =
    social.length > 0
      ? p(
          SOCIAL_NOTES[pickVariant(profile.slug, batchDate, "social", SOCIAL_NOTES.length)](
            brand,
            social.map((s) => extLink(s.url, s.label)).join(" and ")
          )
        )
      : "";

  const { html: sourcesHtml, urls } = sourcesSection(snippets, profile.slug, batchDate);
  const vi = (salt: string, count: number) => pickVariant(profile.slug, batchDate, salt, count);

  const bodyHtml = [
    p(OPENING_WRAPPERS[vi("open", OPENING_WRAPPERS.length)](angle, cardName)),
    h2(TREND_HEADINGS[vi("trend-h", TREND_HEADINGS.length)]),
    ul(trendBullets.map((t) => t.replace(/<[^>]+>/g, ""))),
    h2(ABOUT_HEADINGS[vi("about-h", ABOUT_HEADINGS.length)](brand)),
    p(profile.about),
    h2(BALANCE_HEADINGS[vi("balance-h", BALANCE_HEADINGS.length)]),
    p(profile.balanceCheck.intro),
  ]
    .concat(
      profile.balanceCheck.tip ? p(`<em>Practical note:</em> ${profile.balanceCheck.tip}`) : [],
      [h2(DEMAND_HEADINGS[vi("demand-h", DEMAND_HEADINGS.length)]), p(profile.whyWanted)],
      socialNote ? [socialNote] : [],
      [
        h2(TRADE_HEADINGS[vi("trade-h", TRADE_HEADINGS.length)]),
        p(TRADE_PARAS[vi("trade-p", TRADE_PARAS.length)](cardName, sellSlug)),
        sourcesHtml,
        p(
          `<small>Published ${batchDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}. ` +
            `Information is compiled from public brand pages for educational purposes and may change without notice.</small>`
        ),
      ]
    )
    .flat()
    .join("\n");

  return { title, metaTitle, metaDesc, excerpt, bodyHtml, sourceUrls: urls };
}

async function writeWithOpenAI(
  cardName: string,
  profile: GiftCardProfile,
  researchBrief: string,
  sellSlug: string,
  batchDate: Date,
  siblingBrands: string[] = []
): Promise<GeneratedInsight | null> {
  const apiKey = env.openai.apiKey;
  if (!apiKey) return null;

  const dateStr = batchDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const system = `You are a professional SEO content writer for GiftCard4Sale, a gift card exchange platform.
Write unique, well-researched insight articles about gift card brands. Each article in a daily batch must read distinctly — vary sentence structure, section headings, opening hooks, and word choice. Never reuse the same phrases across articles (avoid stock lines like "What's moving in the market", "stored-value products", "one of today's featured gift cards", or "Trading unused balance").
Output valid HTML only (no markdown): use <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, and <a href="..." target="_blank" rel="noopener noreferrer"> for source links.
Include a "Sources" section with linked references from the research brief.
Minimum 450 words. Tone: professional, informative, not salesy.
End with a brief note linking readers to sell their card at /${sellSlug} (use relative path).`;

  const siblingNote =
    siblingBrands.length > 0
      ? `\nOther brands already covered in today's batch (write completely differently from these): ${siblingBrands.join(", ")}.`
      : "";

  const user = `Write a gift card insights article for ${dateStr}.

Card: ${cardName}
Brand: ${profile.brand}
Category: ${profile.category}${siblingNote}

Brand context:
${profile.hook}
${profile.about.slice(0, 500)}

Official research snippets (cite these with links):
${researchBrief}

Requirements:
- Compelling unique title (not generic; must differ from other brands' insight titles)
- Cover recent news, trends, products, or events inferred from the research
- Use fresh section headings — do not repeat heading wording used for other gift cards
- Section on what this means for gift card holders (unique framing per brand)
- Section on balance checks / redemption practicalities (brand-specific steps)
- Sources section with external links
- Meta description under 160 characters (return as first line META: ...) 
- Excerpt under 220 characters (return as second line EXCERPT: ...)
Then the HTML body.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openai.model,
        temperature: 0.75,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("OpenAI insight writer:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const lines = raw.split("\n");
    let metaDesc = `${profile.brand} gift card news and trends — ${dateStr}.`;
    let excerpt = profile.hook.slice(0, 220);
    let bodyStart = 0;

    for (let i = 0; i < Math.min(3, lines.length); i++) {
      if (lines[i].startsWith("META:")) {
        metaDesc = lines[i].replace(/^META:\s*/i, "").trim().slice(0, 160);
        bodyStart = i + 1;
      } else if (lines[i].startsWith("EXCERPT:")) {
        excerpt = lines[i].replace(/^EXCERPT:\s*/i, "").trim().slice(0, 220);
        bodyStart = i + 1;
      }
    }

    const bodyHtml = normalizeBodyHtml(lines.slice(bodyStart).join("\n"));
    const titleMatch = bodyHtml.match(/<h2[^>]*>([^<]+)<\/h2>/i);
    const title =
      titleMatch?.[1]?.trim() ||
      `${profile.brand} Insights — ${batchDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    const sourceUrls = [...bodyHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);

    return {
      title,
      metaTitle: `${profile.brand} Gift Card News & Trends | GiftCard4Sale Insights`,
      metaDesc,
      excerpt,
      bodyHtml,
      sourceUrls: [...new Set(sourceUrls)],
    };
  } catch (err) {
    console.warn("OpenAI insight writer error:", (err as Error).message);
    return null;
  }
}

export async function writeInsightArticle(opts: {
  cardName: string;
  profile: GiftCardProfile;
  snippets: ResearchSnippet[];
  researchBrief: string;
  sellSlug: string;
  batchDate: Date;
  /** Brands already published in the same daily batch — used to avoid repetitive phrasing. */
  siblingBrands?: string[];
}): Promise<GeneratedInsight> {
  const ai = await writeWithOpenAI(
    opts.cardName,
    opts.profile,
    opts.researchBrief,
    opts.sellSlug,
    opts.batchDate,
    opts.siblingBrands
  );
  if (ai) return ai;

  return buildFallbackInsight(
    opts.cardName,
    opts.profile,
    opts.snippets,
    opts.sellSlug,
    opts.batchDate
  );
}
