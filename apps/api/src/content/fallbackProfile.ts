import type { GiftCardProfile } from "./types";

type Category = GiftCardProfile["category"];

const CATEGORY_KEYWORDS: [RegExp, Category][] = [
  [/game|gaming|xbox|playstation|steam|roblox|fortnite|valorant|apex|league|nexon|blizzard|discord|ea-play|vbucks|coins|jawaker|imvu|r2-games/i, "gaming"],
  [/pizza|restaurant|food|grub|subway|domino|papa|olive|applebee|burger|kitchen/i, "food"],
  [/airline|air|hotel|booking|travel|uber|lyft|southwest|united|delta/i, "travel"],
  [/visa|mastercard|prepaid|voucher|pin|moneypak|vanilla|flexepin|neosurf|cashlib|transcash|cashtocode|upi|refill|mobile|boost|t-mobile|bitjem|bitrefill|pcs|crypto/i, "prepaid"],
  [/netflix|itunes|google|apple|skype|nordvpn|tinder|discord|digital|subscription|vpn|credits/i, "digital"],
  [/amazon|ebay|walmart|target|marketplace|flipkart|ozon|wildberries|tmall|jd|americanas|ozon/i, "marketplace"],
  [/fashion|apparel|clothing|nike|gap|calvin|superdry|saks|zappos|old-navy|victoria|ulta|sephora/i, "fashion"],
];

function detectCategory(slug: string, name: string): Category {
  const haystack = `${slug} ${name}`;
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(haystack)) return cat;
  }
  return "retail";
}

function brandFromName(name: string): string {
  return name.replace(/\s+gift\s+card$/i, "").replace(/\s+\(.*\)$/, "").trim();
}

const CATEGORY_ABOUT: Record<Category, (brand: string, name: string) => string> = {
  retail: (brand, name) =>
    `${brand} operates as a recognized retail brand offering ${name} products and services to consumers through physical stores and e-commerce where available. ` +
    `${brand} gift cards provide prepaid purchasing power that simplifies gifting and budget management — recipients choose what they want while givers avoid guessing sizes, colors, or preferences. ` +
    `Gift cards are typically sold in fixed denominations with terms printed on packaging. Regional restrictions may apply depending on where the card was purchased. ` +
    `Secondary markets exist because gift recipients sometimes prefer cash or crypto over store credit, creating opportunities to sell unused ${name} cards at competitive rates on platforms like GiftCard4Sale.`,
  gaming: (brand, name) =>
    `${brand} is part of the interactive entertainment industry where digital content, in-game currency, and subscription services drive consumer spending. ` +
    `${name} products add credit to gaming accounts for purchases within specific platforms or titles. ` +
    `Region locking is common — US codes require US accounts, EU codes require EU accounts. ` +
    `The global gaming market exceeds hundreds of billions annually, and prepaid cards remain a primary payment method for players without credit cards or those managing parental spending limits. ` +
    `Unused ${name} codes trade actively because gifted players may prefer cash while buyers seek discounted credit for upcoming game launches and seasonal content.`,
  food: (brand, name) =>
    `${brand} participates in the food service and restaurant industry serving meals through dine-in, delivery, and pickup channels. ` +
    `${name} gift cards let customers prepay for menu items without linking a payment card to the brand's app or website. ` +
    `Restaurant gift cards are perennially popular for birthdays, employee recognition, and casual gifting because everyone eats. ` +
    `Digital e-gift delivery makes last-minute restaurant gifts instant. When recipients prefer cash over dining out, ${name} cards sell on secondary markets at modest discounts.`,
  travel: (brand, name) =>
    `${brand} operates in the travel and transportation sector connecting people with mobility, lodging, or booking services. ` +
    `${name} gift cards and vouchers prepay for rides, flights, hotel nights, or platform credit without exposing personal payment details. ` +
    `Travel gifting peaks around holidays and graduation season. Corporate travel programs distribute prepaid credit that employees occasionally convert to cash through resale when personal travel plans change.`,
  prepaid: (brand, name) =>
    `${brand} issues or distributes prepaid payment products including vouchers, PINs, and reload packs used for online payments, mobile top-ups, or general merchant spending. ` +
    `${name} products appeal to underbanked consumers, privacy-conscious shoppers, and international buyers facing limited card acceptance. ` +
    `Verification on resale platforms focuses on unused codes, clear activation receipts, and accurate denomination reporting. ` +
    `Prepaid products differ from closed-loop retail cards because redemption paths vary by issuer — always follow the instructions printed on your specific ${name} product.`,
  digital: (brand, name) =>
    `${brand} provides digital services spanning streaming, communication, software subscriptions, or online platforms accessed through accounts rather than physical stores. ` +
    `${name} gift products fund subscriptions or account credit for these services. Digital gift codes deliver instantly by email, making them popular for remote gifting. ` +
    `Subscription auto-renewal may draw from prepaid balance when configured. Region and account-country matching is critical for successful redemption.`,
  marketplace: (brand, name) =>
    `${brand} operates an e-commerce marketplace connecting buyers with sellers across product categories from electronics to fashion. ` +
    `${name} vouchers add wallet credit for marketplace purchases, simplifying checkout in local currency. ` +
    `Marketplace gift cards are especially popular during mega-sale events when shoppers preload credit to capture lightning deals. Cross-border gifting and corporate incentives feed secondary market supply.`,
  fashion: (brand, name) =>
    `${brand} is a fashion and lifestyle retailer offering apparel, accessories, beauty, or footwear through stores and online channels. ` +
    `${name} gift cards let shoppers refresh wardrobes, buy gifts, or access seasonal collections without upfront cash outlay. ` +
    `Fashion gift cards circulate heavily during holidays and sales events when discounted credit amplifies clearance savings. Recipients who prefer cash sell unused balance through verified exchange platforms.`,
};

const CATEGORY_BALANCE: Record<Category, (brand: string) => GiftCardProfile["balanceCheck"]> = {
  retail: (brand) => ({
    intro: `Checking your ${brand} gift card balance before selling ensures you quote the correct denomination and avoid trade delays.`,
    steps: [
      `Visit the official ${brand} website and look for a <strong>Gift Cards</strong> or <strong>Check Balance</strong> page.`,
      `Enter the card number and PIN (security code) from the back of physical cards or your email receipt for e-gifts.`,
      `In store, ask a cashier to scan the card — most retailers can report remaining balance at the register.`,
      `Check the customer service phone number on the card back for automated balance inquiry.`,
      `Keep your original purchase receipt until the trade completes in case verification requires proof of activation.`,
    ],
    tip: `Never scratch PIN panels or share codes publicly before your GiftCard4Sale trade is verified.`,
  }),
  gaming: (brand) => ({
    intro: `${brand} account credit is visible after redeeming codes through the official publisher portal or game client.`,
    steps: [
      `Log into the official ${brand} account portal or game launcher associated with your product.`,
      `Navigate to <strong>Redeem Code</strong>, <strong>Add Funds</strong>, or <strong>Wallet</strong> in account settings.`,
      `Enter the unused PIN from your card or digital receipt — redeemed credit cannot be sold as a code.`,
      `Confirm the region on the card matches your account country before redeeming.`,
      `For unredeemed cards, the face value is printed on retail packaging or the purchase email.`,
    ],
    tip: `If you plan to sell, do not redeem the code to a personal account first.`,
  }),
  food: (brand) => ({
    intro: `${brand} gift card balances are typically managed through the brand's mobile app or website account wallet.`,
    steps: [
      `Download the official ${brand} app or visit the brand's website.`,
      `Sign in and open <strong>Account → Gift Cards</strong> or <strong>Payment Methods</strong>.`,
      `Select <strong>Redeem Gift Card</strong> and enter your code to view applied balance.`,
      `Remaining credit shows automatically at checkout on your next order.`,
      `For unredeemed cards, the denomination is printed on packaging or the e-gift email.`,
    ],
  }),
  travel: (brand) => ({
    intro: `${brand} travel and ride credit appears in your account wallet after gift card redemption.`,
    steps: [
      `Open the official ${brand} app or website and sign into your account.`,
      `Go to <strong>Payment</strong>, <strong>Wallet</strong>, or <strong>Gift Cards</strong> in settings.`,
      `Enter the gift code from your email or physical card.`,
      `Applied balance displays before confirming your next booking or ride.`,
      `Contact ${brand} customer support with your order confirmation if the code fails.`,
    ],
  }),
  prepaid: (brand) => ({
    intro: `${brand} prepaid products use issuer-specific portals — always follow instructions printed on your card or voucher.`,
    steps: [
      `Locate the balance-check URL or phone number on the product packaging.`,
      `Enter the PIN, voucher code, or card number on the issuer's official website.`,
      `Register the product with your billing ZIP if required for online use.`,
      `Keep the retail activation receipt showing the paid denomination.`,
      `For single-use vouchers, unused codes hold full face value until redeemed at a partner merchant.`,
    ],
    tip: `Treat prepaid PINs like cash — share only through secure trade channels.`,
  }),
  digital: (brand) => ({
    intro: `${brand} digital subscriptions and credits redeem through account settings on the official platform.`,
    steps: [
      `Sign into your ${brand} account on the official website or app.`,
      `Open <strong>Account → Subscription</strong>, <strong>Billing</strong>, or <strong>Redeem</strong>.`,
      `Enter the gift code or PIN from your purchase email.`,
      `Confirm the service region matches your account country.`,
      `Check subscription status or wallet balance after successful redemption.`,
    ],
  }),
  marketplace: (brand) => ({
    intro: `${brand} marketplace gift vouchers bind to your shopping account wallet after code entry.`,
    steps: [
      `Log into the official ${brand} website or mobile app.`,
      `Navigate to <strong>Account → Gift Cards</strong> or <strong>Wallet</strong>.`,
      `Enter the voucher or gift card code from your email or physical card.`,
      `Balance applies automatically at checkout on eligible listings.`,
      `Marketplace customer service assists with codes that fail to bind.`,
    ],
  }),
  fashion: (brand) => ({
    intro: `${brand} gift card balance checks are available online and in participating stores.`,
    steps: [
      `Visit ${brand}'s official website gift card section and select <strong>Check Balance</strong>.`,
      `Enter card number and PIN from the back of the card.`,
      `In store, associates can scan the card at checkout.`,
      `Fashion brand apps often include a wallet section for stored gift cards.`,
      `E-gift purchasers should check the confirmation email for code and denomination.`,
    ],
  }),
};

/** Generate a unique profile for any card slug not covered by hand-written profiles. */
export function buildDynamicProfile(slug: string, name: string): GiftCardProfile {
  const brand = brandFromName(name);
  const category = detectCategory(slug, name);
  const aboutFn = CATEGORY_ABOUT[category];

  return {
    slug,
    category,
    brand,
    hook:
      `${name} holders carry prepaid value that can be converted to USDT, Naira, or Ghana Cedi on GiftCard4Sale when they prefer cash over store credit. ` +
      `Whether you received ${brand} credit as a gift, promotion, or corporate reward, our live rate calculator shows your exact payout before you open a trade.`,
    about: aboutFn(brand, name),
    balanceCheck: CATEGORY_BALANCE[category](brand),
    whyWanted:
      `Discount seekers buy ${brand} gift cards below face value to stretch everyday budgets on products and services they already purchase. ` +
      `Gift recipients who do not shop at ${brand} prefer selling for cash rather than letting credit sit unused. ` +
      `International shoppers sometimes seek region-specific ${name} products to access catalogs unavailable in their home country. ` +
      `Employer incentives, survey rewards, and holiday gifts create steady supply on secondary markets — GiftCard4Sale connects sellers with buyers at transparent, data-driven rates.`,
    redemptionNotes:
      `Follow the redemption instructions printed on your ${name} for spending at official ${brand} channels. ` +
      `Region, denomination, and product format (physical vs e-code) affect both redemption and resale value. ` +
      `If you plan to sell rather than spend, keep codes private and verify balance before submitting a trade.`,
    faq: [
      {
        q: `Can I sell my ${name} on GiftCard4Sale?`,
        a: `Yes — when rates appear in our calculator for your card's region and denomination. Enter exact details for an accurate quote in USDT, NGN, or GHS.`,
      },
      {
        q: `How do I check my ${brand} gift card balance?`,
        a: `Use the official ${brand} balance portal, mobile app, or in-store scan described in this guide before opening a trade.`,
      },
      {
        q: `Are physical and e-gift ${name} cards both accepted?`,
        a: `Both formats are accepted when unused and verifiable, provided our rate table lists your card tier.`,
      },
      {
        q: `Why is my ${name} quoted rate below face value?`,
        a: `Secondary market rates reflect buyer demand, verification costs, and currency conversion — our calculator shows live marketplace pricing with no hidden fees.`,
      },
    ],
    metaKeywords: [`${brand} gift card balance`, `sell ${name}`, `${brand} gift card exchange`],
  };
}

export function resolveProfile(slug: string, name: string, profiles: Record<string, GiftCardProfile>): GiftCardProfile {
  return profiles[slug] ?? buildDynamicProfile(slug, name);
}
