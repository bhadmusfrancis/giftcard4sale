import type { GeneratedArticle, GiftCardProfile } from "./types";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function p(text: string): string {
  return `<p>${text}</p>`;
}

function h2(text: string): string {
  return `<h2>${esc(text)}</h2>`;
}

function h3(text: string): string {
  return `<h3>${esc(text)}</h3>`;
}

function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

export function buildArticle(profile: GiftCardProfile, cardName: string): GeneratedArticle {
  const brand = profile.brand;
  const title = `Sell ${cardName} for USDT, Naira or Cedi`;
  const metaTitle = `Sell ${cardName} Instantly | Best Rates | GiftCard4Sale`;
  const metaDesc =
    `Sell your ${cardName} for USDT, Naira, or Ghana Cedi at competitive rates. ` +
    `${profile.metaKeywords.slice(0, 3).join(", ")}. ` +
    `Check your balance, calculate your payout, and trade securely on GiftCard4Sale.`;

  const balanceSteps = profile.balanceCheck.steps.map((s) => `<li>${s}</li>`).join("");
  const faqHtml = profile.faq
    .map(
      (f) =>
        `<details class="faq-item"><summary><strong>${esc(f.q)}</strong></summary><p>${f.a}</p></details>`
    )
    .join("");

  const bodyHtml = [
    p(
      `If you have an unused <strong>${esc(cardName)}</strong> sitting in a drawer or inbox, you are holding real purchasing power. ${profile.hook} On GiftCard4Sale you can convert that balance into <strong>USDT, Nigerian Naira (NGN), or Ghana Cedi (GHS)</strong> using our live rate calculator shown on this page.`
    ),
    p(
      `Whether your card is physical or a digital e-code, the process is straightforward: verify the balance, enter the face value and region in the calculator, review your exact payout, and open a trade. We accept only valid, unused cards — partial balances are fine as long as the amount matches what you submit.`
    ),
    "<!--rate-break-->",
    h2(`About ${brand} gift cards`),
    p(profile.about),
    h2(`How to check your ${brand} gift card balance`),
    p(profile.balanceCheck.intro),
    `<ol class="balance-steps">${balanceSteps}</ol>`,
    profile.balanceCheck.tip ? p(`<em>Tip:</em> ${profile.balanceCheck.tip}`) : "",
    h2(`Why people buy ${brand} gift cards at a discount`),
    p(profile.whyWanted),
    h3("Smart ways to use your balance"),
    p(profile.redemptionNotes),
    h2(`Why sell your ${cardName} on GiftCard4Sale`),
    ul([
      `<strong>Transparent pricing</strong> — see your exact payout in USDT, Naira, or Cedi before you commit.`,
      `<strong>Physical cards and e-codes</strong> — we buy both formats when your card type supports them.`,
      `<strong>Fast settlement</strong> — verified trades are paid to your wallet, bank, or crypto address.`,
      `<strong>Referral rewards</strong> — earn ongoing commission when friends you invite complete trades.`,
      `<strong>Trust score protection</strong> — always submit accurate card details; invalid cards affect your account standing.`,
    ]),
    h2(`Who buys ${brand} gift cards — and why discounts exist`),
    p(
      `Gift card discounts are a normal part of the secondary market, not a sign that something is wrong with your card. ` +
        `Deal hunters, budget-conscious families, resellers, and international shoppers all prefer paying slightly less than face value in exchange for liquidity they can spend on their own timeline. ` +
        `When you received ${brand} credit from a promotion, employer reward, or gift you will not use, selling at a small discount converts that locked store credit into cash or crypto you can actually spend. ` +
        `GiftCard4Sale connects sellers in Nigeria, Ghana, and worldwide with buyers seeking ${brand} balance — our live rates reflect that real market demand updated from partner marketplace data.`
    ),
    h2("Common mistakes to avoid when selling"),
    ul([
      `<strong>Redeeming before selling</strong> — once ${brand} credit is applied to a personal account, it usually cannot be resold as a transferable code.`,
      `<strong>Wrong region selected</strong> — a US ${brand} card quoted as UK will fail verification and delay payment.`,
      `<strong>Incorrect denomination</strong> — always balance-check and enter the exact unused amount in the calculator.`,
      `<strong>Sharing codes publicly</strong> — never post gift card PINs in social media comments or unsecured chats before trade completion.`,
      `<strong>Submitting used cards</strong> — zero-balance or previously redeemed cards harm your trust score and waste verification time.`,
    ]),
    h2(`How to sell your ${cardName} — step by step`),
    `<ol class="sell-steps">
      <li>Use the <strong>rate calculator on this page</strong> (right side on desktop) to select your card region, denomination, and payout currency.</li>
      <li>Confirm the card is unused and note the exact face value — mismatched amounts delay payment.</li>
      <li>Sign in or create a free GiftCard4Sale account.</li>
      <li>Open a trade, upload clear photos of the physical card (front and back where required) or paste the e-code securely.</li>
      <li>Receive your payout once verification completes — timing depends on card type and trade volume.</li>
    </ol>`,
    h2("Frequently asked questions"),
    `<div class="faq-list">${faqHtml}</div>`,
    p(
      `Ready to turn your ${esc(cardName)} into cash? Scroll to the calculator, enter your card details, and see today's rate instantly. GiftCard4Sale serves sellers across Nigeria, Ghana, and the global crypto community with competitive ${brand} gift card exchange rates updated regularly from marketplace data.`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  return { title, metaTitle, metaDesc, bodyHtml, wordCount: countWords(bodyHtml) };
}

export function buildArticleFromSlug(
  profiles: Record<string, GiftCardProfile>,
  slug: string,
  cardName: string
): GeneratedArticle | null {
  const profile = profiles[slug];
  if (!profile) return null;
  return buildArticle(profile, cardName);
}
