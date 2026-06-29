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

function monthTopic(month: number): string {
  return MONTH_TOPICS[month % MONTH_TOPICS.length];
}

/**
 * Small, fast, deterministic PRNG (mulberry32 seeded via a string hash).
 * Seeding by slug + batch date + ordinal keeps regeneration idempotent while
 * giving every post its own independent stream of choices.
 */
function makeRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffleSeeded<T>(rng: Rng, arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * A per-post lexicon: by drawing one synonym per recurring concept up front,
 * each article keeps its own internal vocabulary, so two posts never lean on the
 * same nouns ("stored-value products", "holders", "secondary market", …).
 */
interface Lexicon {
  storedValue: string;
  holders: string;
  market: string;
  credit: string;
  buyers: string;
  cash: string;
}

const LEX_POOLS = {
  storedValue: [
    "stored-value products",
    "prepaid gift credit",
    "gift balances",
    "prepaid gift cards",
    "digital gift credit",
    "branded gift-card value",
  ],
  holders: ["holders", "cardholders", "card owners", "recipients", "balance holders"],
  market: [
    "secondary market",
    "resale market",
    "peer-to-peer market",
    "aftermarket",
    "resale channels",
  ],
  credit: ["credit", "balance", "value", "face value", "funds"],
  buyers: ["buyers", "traders", "resellers", "market participants"],
  cash: ["cash", "spendable funds", "liquidity", "withdrawable value"],
};

function buildLexicon(rng: Rng): Lexicon {
  return {
    storedValue: pick(rng, LEX_POOLS.storedValue),
    holders: pick(rng, LEX_POOLS.holders),
    market: pick(rng, LEX_POOLS.market),
    credit: pick(rng, LEX_POOLS.credit),
    buyers: pick(rng, LEX_POOLS.buyers),
    cash: pick(rng, LEX_POOLS.cash),
  };
}

const ANGLE_INTROS: ((brand: string, lex: Lexicon) => string)[] = [
  (brand, lex) =>
    `Industry watchers are tracking how ${brand} is positioning its prepaid range as flexible spending tools for both everyday shoppers and digital-first ${lex.holders}.`,
  (brand, lex) =>
    `Retail analysts note that ${brand} continues to refine how customers discover, purchase, and redeem ${lex.storedValue} across web and mobile channels.`,
  (brand, lex) =>
    `Consumer spending data suggests ${brand} ${lex.credit} remains a practical bridge between promotional rewards and discretionary purchases.`,
  (brand, lex) =>
    `Brand strategists highlight ${brand}'s ongoing effort to connect loyalty, gifting, and e-commerce in a single prepaid experience.`,
  (brand, lex) =>
    `Market commentators observe steady demand for ${brand} ${lex.storedValue}, particularly where regional catalogs and subscription bundles overlap.`,
  (brand, lex) =>
    `Payment researchers point to ${brand} as a bellwether for how major issuers blend physical retail, e-commerce, and mobile-wallet redemption.`,
  (brand, lex) =>
    `${cap(lex.buyers)} watching ${lex.market} report that ${brand} ${lex.credit} moves quickly whenever a promotional window opens or a catalog refresh lands.`,
  (brand, lex) =>
    `A closer look at ${brand} shows an issuer steadily widening where its ${lex.storedValue} can be earned, gifted, and spent.`,
  (brand, lex) =>
    `For anyone holding ${brand} ${lex.credit}, the story this period is less about hype and more about how reliably the balance converts into everyday value.`,
  (brand, lex) =>
    `${brand} has spent recent quarters tightening the loop between its rewards program and its prepaid catalog, and ${lex.holders} are feeling the difference.`,
  (brand, lex) =>
    `Few prepaid brands sit at as many checkout pages as ${brand}, which is exactly why its ${lex.storedValue} draw such consistent attention from ${lex.buyers}.`,
  (brand, lex) =>
    `The most useful way to read ${brand} right now is through its ${lex.holders}: where they shop, how they redeem, and what they do with leftover ${lex.credit}.`,
];

const OPENING_WRAPPERS: ((angle: string, cardName: string) => string)[] = [
  (angle, cardName) =>
    `<strong>${angle}</strong> Below is a concise briefing on <strong>${cardName}</strong>, drawn from the issuer's public web and social channels.`,
  (angle, cardName) =>
    `<strong>${angle}</strong> This report centers on <strong>${cardName}</strong> and what official sources are signaling right now.`,
  (angle, cardName) =>
    `<strong>${angle}</strong> We reviewed issuer-published material to assemble this snapshot for <strong>${cardName}</strong>.`,
  (angle, cardName) =>
    `<strong>${angle}</strong> The notes that follow cover <strong>${cardName}</strong> — compiled from brand websites, newsrooms, and verified social feeds.`,
  (angle, cardName) =>
    `<strong>${angle}</strong> Here is today's editorial read on <strong>${cardName}</strong>, based solely on publicly available issuer communications.`,
  (angle, cardName) =>
    `<strong>${angle}</strong> What follows is a practical, source-checked overview of <strong>${cardName}</strong> for shoppers and sellers alike.`,
  (angle, cardName) =>
    `<strong>${angle}</strong> Consider this a working brief on <strong>${cardName}</strong>, stitched together from the brand's own announcements.`,
  (angle, cardName) =>
    `<strong>${angle}</strong> The breakdown below unpacks <strong>${cardName}</strong> using only first-party, publicly verifiable sources.`,
];

const TREND_HEADINGS = [
  "What's moving in the market",
  "Recent signals worth watching",
  "Headlines and market pulse",
  "Notable developments this cycle",
  "Trends shaping card value",
  "On the radar right now",
  "Where attention is heading",
  "The current read",
  "What the latest sources show",
];

const TREND_LEADS: ((brand: string, lex: Lexicon) => string)[] = [
  (brand, lex) => `Recent issuer activity gives ${brand} ${lex.holders} a few things to keep an eye on:`,
  (brand) => `Pulling from ${brand}'s public channels, a handful of threads stand out:`,
  (brand, lex) => `The signals below shape how ${lex.buyers} are reading ${brand} this period:`,
  (brand) => `Here is what the latest ${brand} sources point to:`,
  (brand, lex) => `A scan of official ${brand} updates surfaces these developments for ${lex.holders}:`,
];

const ABOUT_HEADINGS: ((brand: string) => string)[] = [
  (brand) => `About ${brand} stored-value products`,
  (brand) => `${brand} prepaid program at a glance`,
  (brand) => `How ${brand} gift balances work`,
  (brand) => `${brand} card program overview`,
  (brand) => `Understanding ${brand} prepaid credit`,
  (brand) => `The basics behind ${brand} gift cards`,
  (brand) => `Inside the ${brand} gifting ecosystem`,
  (brand) => `What ${brand} cards actually cover`,
];

const BALANCE_HEADINGS = [
  "Redemption and balance checks",
  "Checking your balance",
  "Balance lookup and redemption",
  "How to verify remaining credit",
  "Practical redemption steps",
  "Confirming what's left on the card",
  "Reading your remaining value",
  "Balance, step by step",
];

const STEP_LEADS = [
  "To confirm what's left, walk through these steps:",
  "Verifying a balance is straightforward:",
  "Here is the practical sequence:",
  "Follow this short checklist:",
  "The quickest path looks like this:",
];

const TIP_LABELS = ["Practical note", "Worth remembering", "One tip", "Quick reminder", "Keep in mind"];

const DEMAND_HEADINGS = [
  "Why demand stays elevated",
  "What drives secondary interest",
  "Why traders watch this brand",
  "Demand factors to know",
  "Why balances change hands",
  "What keeps interest steady",
  "The pull behind the resale",
  "Why this card keeps moving",
];

const TRADE_HEADINGS = [
  "Trading unused balance",
  "Converting credit you won't spend",
  "Liquidating leftover balance",
  "Options for unused credit",
  "Turning balance into cash",
  "Cashing out what you won't use",
  "Putting idle credit to work",
  "From leftover card to payout",
];

const TRADE_PARAS: ((cardName: string, sellSlug: string, lex: Lexicon) => string)[] = [
  (cardName, sellSlug, lex) =>
    `Leftover ${cardName} ${lex.credit} can be converted through a verified marketplace into USDT, Naira, or Cedi. ` +
    `Review live payout quotes on our ${extLink(`/${sellSlug}`, `${cardName} rate page`)} before you submit.`,
  (cardName, sellSlug, lex) =>
    `When you do not plan to spend a ${cardName} ${lex.credit}, a regulated exchange offers a path to USDT, Naira, or Cedi ${lex.cash}. ` +
    `Start with today's rates on the ${extLink(`/${sellSlug}`, `${cardName} calculator`)}.`,
  (cardName, sellSlug, lex) =>
    `Unused ${cardName} funds are often listed on ${lex.market} channels. ` +
    `Compare current buy-side pricing via our ${extLink(`/${sellSlug}`, `${cardName} payout page`)} before opening a trade.`,
  (cardName, sellSlug, lex) =>
    `${cap(lex.holders)} who prefer ${lex.cash} over in-store spending can liquidate ${cardName} ${lex.credit} for USDT, Naira, or Cedi. ` +
    `Check the ${extLink(`/${sellSlug}`, `live ${cardName} quote`)} to see what your denomination earns today.`,
  (cardName, sellSlug, lex) =>
    `Rather than letting ${cardName} ${lex.credit} sit idle, many sellers route balances through GiftCard4Sale for USDT, Naira, or Cedi payout. ` +
    `Visit the ${extLink(`/${sellSlug}`, `${cardName} rate tool`)} for an instant estimate.`,
  (cardName, sellSlug, lex) =>
    `If a ${cardName} balance is unlikely to be spent, exchanging it beats letting it expire. ` +
    `Our ${extLink(`/${sellSlug}`, `${cardName} rate page`)} shows the current USDT, Naira, and Cedi payout for each denomination.`,
  (cardName, sellSlug, lex) =>
    `Turning a ${cardName} ${lex.credit} into ${lex.cash} takes minutes on a verified platform. ` +
    `Pull a real-time figure from the ${extLink(`/${sellSlug}`, `${cardName} calculator`)} before you commit.`,
];

const REDEMPTION_LEADS = [
  "A couple of redemption details worth flagging:",
  "On the practical side of spending the card:",
  "Before redeeming, note that",
  "When it comes to using the balance,",
  "On redemption mechanics,",
];

const SOCIAL_NOTES: ((brand: string, links: string, lex: Lexicon) => string)[] = [
  (brand, links) =>
    `${brand} posts limited-time offers and product drops on social channels before they reach mainstream press. ` +
    `Monitoring ${links} can reveal promotions that shift how buyers price unused balance.`,
  (brand, links) =>
    `Issuer social feeds for ${brand} frequently announce flash sales, bundle deals, and catalog updates ahead of email campaigns. ` +
    `Follow ${links} if you track resale spreads closely.`,
  (brand, links, lex) =>
    `Brand-owned accounts for ${brand} are often where seasonal campaigns surface first. ` +
    `Watch ${links} for cues that affect near-term demand among ${lex.buyers}.`,
  (brand, links) =>
    `${brand} uses social platforms to tease partnerships and reward events that can move secondary-market appetite. ` +
    `Keeping an eye on ${links} helps holders time their trades.`,
  (brand, links, lex) =>
    `For ${brand}, the fastest read on momentum is usually social: ${links}. ` +
    `Drops announced there tend to ripple into ${lex.market} pricing within days.`,
];

const CLOSING_NOTES = [
  "Information is compiled from public brand pages for educational purposes and may change without notice.",
  "Details are drawn from publicly available issuer sources and can change at any time — confirm before acting.",
  "This briefing reflects public, first-party information only and is provided for general guidance.",
  "All figures and offers reference official channels and may be updated by the issuer without notice.",
  "Compiled from the brand's own public communications; always verify current terms on the issuer's site.",
];

const EXCERPT_FALLBACKS: ((angle: string, cardName: string, brand: string) => string)[] = [
  (angle, cardName) => `${angle.slice(0, 120)} Key takeaways for ${cardName} holders.`,
  (angle, cardName) => `A quick read on ${cardName}: ${angle.slice(0, 100)}…`,
  (_angle, cardName, brand) =>
    `${brand} gift card update — what official channels say and what it means if you hold ${cardName} credit.`,
  (_angle, cardName) =>
    `Official-source briefing on ${cardName}: trends, redemption notes, and market context for this week.`,
  (_angle, cardName, brand) =>
    `Where ${brand} stands today and how ${cardName} balances are best put to use — a short, source-checked read.`,
];

const META_DESC_TEMPLATES: ((brand: string, monthYear: string, keywords: string) => string)[] = [
  (brand, monthYear, keywords) =>
    `${brand} gift card briefing for ${monthYear}: official updates, resale context, and balance tips. ${keywords}.`,
  (brand, monthYear, keywords) =>
    `What ${brand} prepaid holders should know in ${monthYear} — trends, redemption, and trading context. ${keywords}.`,
  (brand, monthYear, keywords) =>
    `${monthYear} ${brand} stored-value roundup: issuer news, seasonal campaigns, and market notes. ${keywords}.`,
  (brand, monthYear, keywords) =>
    `${brand} gift cards in ${monthYear}: how the balance works, where demand sits, and how to cash out. ${keywords}.`,
];

const TITLE_TEMPLATES: ((brand: string, headline: string) => string)[] = [
  (brand, headline) => `${brand} Insights: ${headline}`,
  (brand, headline) => `${brand} Gift Card Brief — ${headline}`,
  (brand, headline) => `${headline}: A ${brand} Gift Card Read`,
  (brand, headline) => `${brand} Watch — ${headline}`,
  (brand, headline) => `Inside ${brand}: ${headline}`,
];

const FALLBACK_TOPIC_LINES: ((topic: string, brand: string, lex: Lexicon) => string)[] = [
  (topic, brand, lex) =>
    `With ${topic} underway, ${brand} shoppers often verify balances before spending or listing unused ${lex.credit}.`,
  (topic, brand) =>
    `As ${topic} pick up, ${brand} holders tend to recheck redemption rules and remaining face value.`,
  (topic, brand, lex) =>
    `During ${topic}, ${brand} ${lex.buyers} watch for issuer promos that can widen or narrow ${lex.market} spreads.`,
  (topic, brand, lex) =>
    `${cap(topic)} tend to bring fresh ${brand} catalog updates, which keeps ${lex.holders} checking what their ${lex.credit} is worth.`,
];

function sourcesSection(
  rng: Rng,
  snippets: ResearchSnippet[]
): { html: string; urls: string[] } {
  const ok = snippets.filter((s) => s.ok);
  const urls = ok.map((s) => s.url);
  const heading = pick(rng, ["Sources consulted", "References", "Official sources", "Where we looked", "What we read"]);
  if (ok.length === 0) {
    return {
      html: p(
        "Official brand channels were consulted for this briefing; verify announcements on the issuer's website before making purchase decisions."
      ),
      urls: snippets.map((s) => s.url),
    };
  }
  const items = ok.map((s) => {
    const detail = s.description ? ` — ${s.description.slice(0, 180)}${s.description.length > 180 ? "…" : ""}` : "";
    return `${extLink(s.url, s.label)}${s.title ? `: <em>${s.title}</em>` : ""}${detail}`;
  });
  return { html: h3(heading) + ul(items), urls };
}

/** Reusable body section, assembled and then ordered per post. */
interface Section {
  key: string;
  html: string;
}

function buildFallbackInsight(
  cardName: string,
  profile: GiftCardProfile,
  snippets: ResearchSnippet[],
  sellSlug: string,
  batchDate: Date,
  ordinal: number
): GeneratedInsight {
  const brand = profile.brand;
  const iso = batchDate.toISOString().slice(0, 10);
  const rng = makeRng(`${profile.slug}|${iso}|${ordinal}`);
  const lex = buildLexicon(rng);

  const angle = pick(rng, ANGLE_INTROS)(brand, lex);
  const topic = monthTopic(batchDate.getUTCMonth());
  const news = snippets.find((s) => s.ok && s.label === "Newsroom");
  const site = snippets.find((s) => s.ok && (s.label === "Official website" || s.label === "Gift cards"));
  const social = snippets.filter((s) => s.ok && /X|Facebook|Instagram/.test(s.label));
  const monthYear = batchDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rawHeadline =
    news?.title?.slice(0, 90) ||
    site?.title?.slice(0, 90) ||
    `${brand} Gift Card Market Brief — ${batchDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  const headline = rawHeadline.replace(new RegExp(`^${brand}\\s*`, "i"), "").trim() || "What Shoppers Should Know";

  const title = pick(rng, TITLE_TEMPLATES)(brand, headline);
  const metaTitle = `${brand} Gift Card News & Trends | GiftCard4Sale Insights`;
  const metaDesc = pick(rng, META_DESC_TEMPLATES)(brand, monthYear, profile.metaKeywords.slice(0, 2).join(", "));

  const excerpt =
    news?.description?.slice(0, 220) ||
    pick(rng, EXCERPT_FALLBACKS)(angle, cardName, brand);

  // --- Trends bullets ---
  const trendBullets: string[] = [];
  if (news?.description) trendBullets.push(news.description.slice(0, 280));
  if (site?.description && site.description !== news?.description) {
    trendBullets.push(site.description.slice(0, 280));
  }
  if (trendBullets.length === 0) {
    trendBullets.push(profile.hook);
    trendBullets.push(pick(rng, FALLBACK_TOPIC_LINES)(topic, brand, lex));
  }

  const { html: sourcesHtml, urls } = sourcesSection(rng, snippets);

  // --- Build the four reorderable core sections ---
  const trendsHtml = [
    h2(pick(rng, TREND_HEADINGS)),
    p(pick(rng, TREND_LEADS)(brand, lex)),
    ul(trendBullets.map((t) => t.replace(/<[^>]+>/g, ""))),
  ].join("\n");

  const aboutHtml = [h2(pick(rng, ABOUT_HEADINGS)(brand)), p(profile.about)].join("\n");

  const balanceParts = [h2(pick(rng, BALANCE_HEADINGS)), p(profile.balanceCheck.intro)];
  if (profile.balanceCheck.steps?.length) {
    balanceParts.push(p(pick(rng, STEP_LEADS)));
    balanceParts.push(ul(profile.balanceCheck.steps));
  }
  if (profile.balanceCheck.tip) {
    balanceParts.push(p(`<em>${pick(rng, TIP_LABELS)}:</em> ${profile.balanceCheck.tip}`));
  }
  const balanceHtml = balanceParts.join("\n");

  const demandHtml = [h2(pick(rng, DEMAND_HEADINGS)), p(profile.whyWanted)].join("\n");

  const coreSections: Section[] = shuffleSeeded(rng, [
    { key: "trends", html: trendsHtml },
    { key: "about", html: aboutHtml },
    { key: "balance", html: balanceHtml },
    { key: "demand", html: demandHtml },
  ]);

  // --- Trade section (kept near the end as the natural call-to-action) ---
  const tradeParts = [h2(pick(rng, TRADE_HEADINGS)), p(pick(rng, TRADE_PARAS)(cardName, sellSlug, lex))];
  if (profile.redemptionNotes) {
    tradeParts.push(p(`${pick(rng, REDEMPTION_LEADS)} ${profile.redemptionNotes}`));
  }
  const tradeHtml = tradeParts.join("\n");

  const socialHtml =
    social.length > 0
      ? p(pick(rng, SOCIAL_NOTES)(brand, social.map((s) => extLink(s.url, s.label)).join(" and "), lex))
      : "";

  const closing = p(
    `<small>Published ${batchDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })}. ${pick(rng, CLOSING_NOTES)}</small>`
  );

  const bodyHtml = [
    p(pick(rng, OPENING_WRAPPERS)(angle, cardName)),
    ...coreSections.map((s) => s.html),
    socialHtml,
    tradeHtml,
    sourcesHtml,
    closing,
  ]
    .filter(Boolean)
    .join("\n");

  return { title, metaTitle, metaDesc, excerpt, bodyHtml, sourceUrls: urls };
}

// Rotating writer personas and article shapes nudge the model away from a single
// house style across a daily batch. Seeded so a given card/date is reproducible.
const AI_PERSONAS = [
  "a seasoned retail-payments analyst who favors precise, evidence-led prose",
  "a consumer-finance journalist with an approachable, plain-English voice",
  "a marketplace strategist who writes crisp, practical briefings",
  "an editorial researcher with a measured, neutral reporting tone",
  "a fintech columnist who explains trends conversationally but rigorously",
];

const AI_FORMATS = [
  "a narrative analysis that flows in connected paragraphs",
  "a structured briefing with a short lead, themed sections, and a takeaway",
  "an explainer that answers the questions a holder would actually ask",
  "a market-note style read with a clear lead and supporting detail",
];

async function writeWithOpenAI(
  cardName: string,
  profile: GiftCardProfile,
  researchBrief: string,
  sellSlug: string,
  batchDate: Date,
  ordinal: number,
  siblingBrands: string[] = []
): Promise<GeneratedInsight | null> {
  const apiKey = env.openai.apiKey;
  if (!apiKey) return null;

  const rng = makeRng(`ai|${profile.slug}|${batchDate.toISOString().slice(0, 10)}|${ordinal}`);
  const persona = pick(rng, AI_PERSONAS);
  const format = pick(rng, AI_FORMATS);

  const dateStr = batchDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const system = `You are ${persona}, writing for GiftCard4Sale, a gift card exchange platform.
Write a unique, well-researched insight article. Structure it as ${format}.
Critically, vary your voice from any other article: change the opening hook, sentence rhythm, section headings, and word choice so no two posts feel templated. Do NOT reuse stock phrases such as "What's moving in the market", "stored-value products", "one of today's featured gift cards", "Trading unused balance", or "Why demand stays elevated"; invent fresh wording each time.
Output valid HTML only (no markdown): use <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, and <a href="..." target="_blank" rel="noopener noreferrer"> for source links.
Include a sources section with linked references from the research brief.
Minimum 450 words. Tone: professional and genuinely informative, never salesy or repetitive.
End with a brief, natural note linking readers to sell their card at /${sellSlug} (use the relative path).`;

  const siblingNote =
    siblingBrands.length > 0
      ? `\nOther brands already covered in today's batch — write in a clearly different voice, structure, and vocabulary from these: ${siblingBrands.join(", ")}.`
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
- A compelling, specific title (never generic; must differ from other brands' insight titles)
- Cover recent news, trends, products, or events inferred from the research
- Use fresh, brand-specific section headings — never the same heading wording used for another card
- A section on what this means for holders, framed uniquely for this brand
- A section on balance checks / redemption practicalities with brand-specific steps
- A sources section with external links
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
        temperature: 0.9,
        top_p: 0.95,
        frequency_penalty: 0.6,
        presence_penalty: 0.4,
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
  // Position in the daily batch — also used to give each post its own RNG stream.
  const ordinal = opts.siblingBrands?.length ?? 0;

  const ai = await writeWithOpenAI(
    opts.cardName,
    opts.profile,
    opts.researchBrief,
    opts.sellSlug,
    opts.batchDate,
    ordinal,
    opts.siblingBrands
  );
  if (ai) return ai;

  return buildFallbackInsight(
    opts.cardName,
    opts.profile,
    opts.snippets,
    opts.sellSlug,
    opts.batchDate,
    ordinal
  );
}
