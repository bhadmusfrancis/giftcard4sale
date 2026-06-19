import type { GiftCardProfile } from "../types";

function profile(p: GiftCardProfile): GiftCardProfile {
  return p;
}

export const TRAVEL_FOOD_DIGITAL_PROFILES: Record<string, GiftCardProfile> = {
  airbnb: profile({
    slug: "airbnb",
    category: "travel",
    brand: "Airbnb",
    hook:
      "Airbnb gift cards fund unique stays — from city apartments to countryside cabins — on the world's largest home-sharing platform with millions of listings.",
    about:
      "Airbnb, Inc. connects travelers with hosts offering short-term rentals, experiences, and boutique stays in 220+ countries. Airbnb gift cards redeem toward booking accommodations and Airbnb Experiences on airbnb.com and the mobile app. Cards are primarily US-denominated though regional programs exist. Credit applies to nightly rates and cleaning fees but may exclude some taxes and host-specific charges per checkout. Airbnb gift cards do not expire under standard US terms. Digital delivery dominates corporate travel incentives and experiential gifting.",
    balanceCheck: {
      intro: "Airbnb gift card balance is managed in your Airbnb account payment settings.",
      steps: [
        "Log into <strong>airbnb.com</strong> or the Airbnb app.",
        "Go to <strong>Account → Payments & payouts → Gift credit</strong>.",
        "Redeem a gift card with the unique code from email or card.",
        "Remaining balance shows before confirming future bookings.",
        "Airbnb support assists with code issues when proof of purchase is available.",
      ],
    },
    whyWanted:
      "Travelers planning vacations fund stays at a discount using below-face-value Airbnb credit. Remote workers booking monthly stays seek prepaid balance. Wedding registry and honeymoon gifts convert to cash when couples prefer bank transfers.",
    redemptionNotes:
      "Apply at checkout on eligible listings. Cannot transfer to hosts directly as cash. Combine one gift card with other payment methods.",
    faq: [
      { q: "Sell Airbnb gift cards?", a: "Yes — unused US Airbnb codes when rates are listed." },
      { q: "International listings?", a: "US cards primarily for airbnb.com US account — region matters." },
      { q: "Experiences eligible?", a: "Yes — Airbnb Experiences accept gift credit." },
      { q: "Partial balance?", a: "Sellable with verified remaining credit." },
    ],
    metaKeywords: ["Airbnb gift card balance", "sell Airbnb card", "Airbnb to Naira"],
  }),

  "delta-air-line": profile({
    slug: "delta-air-line",
    category: "travel",
    brand: "Delta Air Lines",
    hook:
      "Delta gift cards pay for flights, seat upgrades, and vacation packages on a major US airline serving 300+ destinations worldwide.",
    about:
      "Delta Air Lines, Inc. is a legacy US carrier and founding member of the SkyTeam alliance, operating hubs in Atlanta, Detroit, Minneapolis, and other cities. Delta gift cards purchase tickets on delta.com, Delta Vacations, and select partner services. Cards do not expire and have no fees under standard terms. SkyMiles loyalty members can earn miles on paid portions when combining gift cards with cash. Delta sells digital and physical gift cards from $50 to $1,000 — popular corporate travel rewards.",
    balanceCheck: {
      intro: "Delta gift card balances are checked on Delta's official gift card portal.",
      steps: [
        "Visit <strong>delta.com/giftcards</strong> → Check Balance.",
        "Enter card number and PIN (if applicable).",
        "Apply gift card during flight checkout on delta.com.",
        "Delta app payment section shows applied gift credit.",
        "Call Delta Gift Card Support line on delta.com for assistance.",
      ],
    },
    whyWanted:
      "Frequent flyers lock in fares using discounted Delta credit before price increases. Business travelers convert unwanted corporate Delta gifts to cash. Holiday travelers fund family flights with below-face-value cards.",
    redemptionNotes:
      "Valid on delta.com and phone reservations. Cannot buy SkyMiles directly. Partial balances remain on card for future bookings.",
    faq: [
      { q: "Sell Delta e-gift cards?", a: "Yes when unused with verifiable denomination." },
      { q: "Delta Vacations eligible?", a: "Yes — gift cards apply to Delta Vacations packages." },
      { q: "International flights?", a: "US Delta cards work for tickets sold by Delta US — confirm region." },
      { q: "Do Delta cards expire?", a: "No expiration on standard Delta gift cards." },
    ],
    metaKeywords: ["Delta gift card balance", "sell Delta Air Lines card", "Delta gift card"],
  }),

  "hotels-com": profile({
    slug: "hotels-com",
    category: "travel",
    brand: "Hotels.com",
    hook:
      "Hotels.com gift cards unlock hundreds of thousands of hotels worldwide — with Rewards nights earning free stays after ten bookings.",
    about:
      "Hotels.com is an online travel agency owned by Expedia Group, offering hotel bookings globally with the Hotels.com Rewards program (collect 10 nights, get 1 reward night). Hotels.com gift cards redeem on hotels.com toward room rates and taxes where accepted. US cards are most common in resale markets. The platform competes with Booking.com and Expedia on price and loyalty perks. Corporate travel departments distribute Hotels.com cards for flexible employee lodging.",
    balanceCheck: {
      intro: "Hotels.com gift card balance checks use the Expedia Group gift card portal shared across brands.",
      steps: [
        "Visit <strong>hotels.com/gcg</strong> or gift card balance page on hotels.com.",
        "Enter gift card code and PIN.",
        "Apply during hotel checkout — balance displays before payment.",
        "Hotels.com app → Payment → Add gift card.",
        "Customer support with code and receipt for disputes.",
      ],
    },
    whyWanted:
      "Vacation planners stretch hotel budgets with discounted Hotels.com credit. Business travelers without corporate cards use gift balance for work trips. Rewards collectors stack promotions with prepaid payment.",
    redemptionNotes:
      "Apply at hotels.com checkout. Reward night program continues on eligible paid bookings. Cannot redeem for flights directly.",
    faq: [
      { q: "Hotels.com vs Expedia cards?", a: "May share redemption infrastructure — verify card branding." },
      { q: "Sell unused codes?", a: "Yes when rates are available." },
      { q: "International hotels?", a: "US cards primarily — currency conversion at booking." },
      { q: "Partial balance OK?", a: "Yes with verified remaining amount." },
    ],
    metaKeywords: ["Hotels.com gift card balance", "sell Hotels.com card", "Hotels.com voucher"],
  }),

  instacart: profile({
    slug: "instacart",
    category: "food",
    brand: "Instacart",
    hook:
      "Instacart gift cards cover grocery delivery from Costco, Kroger, Aldi, and local stores — bringing supermarket aisles to your doorstep in under an hour.",
    about:
      "Instacart, Inc. partners with over 1,400 retail banners across North America for same-day grocery delivery and pickup. Instacart gift cards fund orders on the Instacart app and website including items, service fees, and tips in supported markets. US cards dominate with digital and physical formats. Instacart+ membership fees may be paid with gift card credit depending on current billing rules. Pandemic-era adoption cemented Instacart as a household staple — gift cards remain popular for elderly parents and busy professionals.",
    balanceCheck: {
      intro: "Instacart gift card balance is redeemed and viewed within the Instacart app.",
      steps: [
        "Open the <strong>Instacart app</strong> → Account → Gift cards.",
        "Tap Redeem gift card and enter code.",
        "Balance applies automatically at checkout.",
        "Instacart.com account settings mirror app gift card management.",
        "Face value printed on physical card or email for unredeemed codes.",
      ],
    },
    whyWanted:
      "Families reduce grocery delivery costs with discounted Instacart credit. Instacart+ subscribers offset membership and fees using prepaid balance. Corporate wellness grocery benefits convert to cash via resale.",
    redemptionNotes:
      "US market focused. Valid on partner retailer inventories through Instacart. Alcohol delivery subject to local law.",
    faq: [
      { q: "Sell Instacart e-gifts?", a: "Yes — unused codes when supported." },
      { q: "Costco via Instacart?", a: "Instacart credit works on Costco Instacart orders where available." },
      { q: "Tips included?", a: "Gift balance can cover tips at checkout." },
      { q: "Rates on GiftCard4Sale?", a: "Check live calculator for Instacart tiers." },
    ],
    metaKeywords: ["Instacart gift card balance", "sell Instacart card", "Instacart delivery gift card"],
  }),

  "starbucks-card": profile({
    slug: "starbucks-card",
    category: "food",
    brand: "Starbucks",
    hook:
      "Starbucks Cards fuel daily coffee rituals — lattes, cold brew, and food items — at over 38,000 locations worldwide with mobile-order convenience.",
    about:
      "Starbucks Corporation operates the world's largest coffeehouse chain with the Starbucks Rewards program integrated into Starbucks Cards and the mobile app. Cards reload in-store, online, and via auto-reload features. Starbucks Cards work in US/Canada corporate stores and many licensed locations (with exceptions). Mobile order & pay makes Starbucks Cards essential for skipping lines. Seasonal promotions (Red Cup Day) spike card sales. Corporate bulk gifting distributes millions in Starbucks credit annually.",
    balanceCheck: {
      intro: "Starbucks makes balance checks instant through the industry-leading mobile app.",
      steps: [
        "Open the <strong>Starbucks app</strong> — balance displays on the home screen when a card is linked.",
        "Add a card via <strong>Scan → Add a card</strong> with card number and security code.",
        "Visit <strong>starbucks.com/card</strong> → Check balance for web lookup.",
        "Any barista can scan your app or physical card at register.",
        "Call 1-800-STARBUC for automated balance with card number.",
      ],
    },
    whyWanted:
      "Daily coffee drinkers save on annual caffeine budgets with discounted Starbucks Cards. Non-coffee drinkers convert holiday gift cards to Naira or USDT. Starbucks Rewards Stars still accrue on gift card purchases.",
    redemptionNotes:
      "Works at most US Starbucks stores and app orders. Cannot buy other gift cards. Auto-reload can drain balance — disable if selling physical card linked to account.",
    faq: [
      { q: "Sell Starbucks physical cards?", a: "Yes — verify balance and ensure card isn't linked to sold account." },
      { q: "Starbucks e-gifts OK?", a: "Yes when unused." },
      { q: "International Starbucks?", a: "Cards are country-specific — US cards for US stores." },
      { q: "Partial balance?", a: "Yes with verified remaining amount." },
    ],
    metaKeywords: ["Starbucks card balance", "sell Starbucks gift card", "Starbucks to Naira"],
  }),

  "apple-gift-card-us-only": profile({
    slug: "apple-gift-card-us-only",
    category: "digital",
    brand: "Apple",
    hook:
      "Apple Gift Cards (US) unify credit for the App Store, Apple Store hardware, subscriptions, and iCloud — the single prepaid key to Apple's US ecosystem.",
    about:
      "Apple Gift Cards in the United States replaced separate iTunes and App Store cards, funding purchases across the App Store, Apple TV, Apple Music, Apple Arcade, iCloud+, and apple.com hardware. US cards require a US Apple ID for redemption. Denominations from $10 to $200 sell at Apple Stores, Amazon, Target, and grocery chains. Apple strictly enforces region matching — US codes fail on EU Apple IDs. Physical cards feature collectible designs; e-gifts deliver instantly. Apple Gift Cards are among the highest-volume traded digital cards in P2P markets.",
    balanceCheck: {
      intro: "Apple US gift card balance is checked through Apple ID payment settings or pre-redemption packaging.",
      steps: [
        "On iPhone: App Store → profile → Redeem Gift Card or Code.",
        "Visit <strong>apple.com/redeem-us</strong> for US accounts.",
        "Apple ID → Payment & Shipping shows balance after redemption.",
        "Physical card shows denomination; e-gift email states value.",
        "Apple Support verifies codes that fail redemption with valid proof of purchase.",
      ],
    },
    whyWanted:
      "US App Store exclusives and Apple One bundles drive US Apple Gift Card demand. iPhone upgraders fund accessories and cases. International buyers need US cards for US Apple ID accounts — creating strong resale liquidity.",
    redemptionNotes:
      "US Apple ID only. Cannot buy third-party gift cards with Apple balance. Hardware purchases on apple.com accept Apple Gift Card at checkout.",
    faq: [
      { q: "Apple Gift Card vs iTunes?", a: "Modern US Apple Gift Cards replace iTunes cards — same ecosystem use." },
      { q: "Sell US Apple cards internationally?", a: "Yes — GiftCard4Sale pays Naira, Cedi, or USDT." },
      { q: "Apple Store hardware eligible?", a: "Yes on apple.com US and US Apple Stores." },
      { q: "Fast vs slow tiers?", a: "Rate tiers may vary by verification speed — check calculator." },
    ],
    metaKeywords: ["Apple Gift Card US balance", "sell Apple gift card", "US Apple card to Naira"],
  }),

  "apple-store": profile({
    slug: "apple-store",
    category: "digital",
    brand: "Apple Store",
    hook:
      "Apple Store gift cards purchase iPhones, MacBooks, AirPods, and accessories at Apple retail locations and apple.com — premium hardware credit.",
    about:
      "Apple Store gift cards (branded for physical Apple retail and online store purchases) fund hardware, accessories, and AppleCare plans at Apple Stores and apple.com. In unified markets, Apple Gift Cards and Apple Store cards may share redemption infrastructure funding both media and hardware. Store-specific branding still appears on legacy and regional cards. High denominations support MacBook and iPhone purchases. Trade-in credits are separate from gift cards. Apple Store cards are popular graduation and holiday gifts given premium product pricing.",
    balanceCheck: {
      intro: "Apple Store gift card balance uses the same Apple redemption system as Apple Gift Cards in unified regions.",
      steps: [
        "Redeem at <strong>apple.com/redeem</strong> or App Store redeem flow.",
        "Check Apple ID → Payment & Shipping for applied balance.",
        "Apple Store app → Shopping → Account → Gift Card Balance.",
        "Genius Bar can assist with in-store balance lookup on redeemed accounts.",
        "Unredeemed card packaging shows face value.",
      ],
    },
    whyWanted:
      "Premium hardware buyers reduce MacBook and iPhone costs with discounted Apple Store credit. Students funding education pricing plus gift cards maximize savings. Gift recipients preferring Android sell Apple credit for cash.",
    redemptionNotes:
      "Hardware and accessories at Apple channels. Balance may also work for digital content on unified Apple Gift Card systems — verify regional unification.",
    faq: [
      { q: "Apple Store vs Apple Gift Card?", a: "In the US, unified cards fund both hardware and digital content." },
      { q: "Sell for USDT?", a: "Yes — US Apple Store/Gift cards commonly traded." },
      { q: "AppleCare eligible?", a: "Yes — gift balance covers AppleCare+ purchases." },
      { q: "Physical card photos?", a: "Upload clear images during trade — code must be unread in public photos until verified." },
    ],
    metaKeywords: ["Apple Store gift card balance", "sell Apple Store card", "Apple hardware gift card"],
  }),

  "disney-gift-cards": profile({
    slug: "disney-gift-cards",
    category: "retail",
    brand: "Disney",
    hook:
      "Disney gift cards unlock magic at theme parks, Disney Store merchandise, shopDisney.com, and onboard Disney Cruise Line — dreams funded with prepaid pixie dust.",
    about:
      "The Walt Disney Company issues gift cards redeemable at Walt Disney World, Disneyland, Disney Store locations, shopDisney.com, and Disney Cruise Line. Disney gift cards never expire and carry no fees under standard US terms. Cards cannot typically pay for Disney+ subscriptions directly — theme park and merchandise focus dominates. Disney Vacation Club members and annual passholders use gift cards to budget park spending. Collectible Disney card designs make popular souvenirs themselves.",
    balanceCheck: {
      intro: "Disney gift card balance checks use Disney's official online portal.",
      steps: [
        "Visit <strong>disneygiftcard.com</strong> → Check Balance.",
        "Enter account number and password (EAN) from card back.",
        "Disney World app → Profile → Gift Cards in park mode.",
        "Disney Store registers scan cards at checkout.",
        "Merge multiple Disney cards onto one account at disneygiftcard.com.",
      ],
      tip: "Merge cards before park visits for easier mobile wallet spending.",
    },
    whyWanted:
      "Families planning Disney vacations fund tickets, food, and merch with discounted gift cards months ahead. Disney collectors buy shopDisney exclusives. Unused wedding and birthday Disney gifts convert to cash.",
    redemptionNotes:
      "Works at US Disney parks, stores, and shopDisney. Not for Disney+ billing in most cases. Mobile wallet linking via disneygiftcard.com.",
    faq: [
      { q: "Sell Disney park gift cards?", a: "Yes — unused US Disney cards when rates are listed." },
      { q: "Disney Cruise eligible?", a: "Yes — Disney gift cards apply onboard and pre-cruise bookings per Disney policy." },
      { q: "Merge then sell?", a: "Sell unused individual cards before merging if codes must remain separate." },
      { q: "Physical vs digital?", a: "Both accepted when verifiable." },
    ],
    metaKeywords: ["Disney gift card balance", "sell Disney gift card", "Disney World gift card"],
  }),

  "dicks-gift-cards": profile({
    slug: "dicks-gift-cards",
    category: "retail",
    brand: "DICK'S Sporting Goods",
    hook:
      "DICK'S Sporting Goods gift cards equip athletes and outdoor enthusiasts with gear for every sport — from youth soccer cleats to premium golf equipment.",
    about:
      "DICK'S Sporting Goods, Inc. is America's largest full-line sporting goods retailer operating DICK'S stores, Golf Galaxy, and Public Lands banners. Gift cards purchase equipment, apparel, footwear, and services across banners where accepted. ScoreCard loyalty integrates with gift card checkout. US cards from $5 to $500 sell year-round with holiday peaks. DICK'S community sports sponsorships distribute gift cards to youth leagues.",
    balanceCheck: {
      intro: "DICK'S gift card balance verification is available online and in-store.",
      steps: [
        "Visit <strong>dickssportinggoods.com/s/gift-cards</strong> → Check Balance.",
        "Enter card number and PIN.",
        "Any DICK'S or Golf Galaxy register scans balance.",
        "DICK'S mobile app wallet section.",
        "Customer service line on dickssportinggoods.com.",
      ],
    },
    whyWanted:
      "Sports parents fund seasonal equipment with discounted DICK'S credit. Golfers stock Golf Galaxy purchases. Holiday athletes convert unwanted cards to cash for other expenses.",
    redemptionNotes:
      "Valid at DICK'S and participating banners. Cannot buy firearms online with gift cards in all jurisdictions — check policy.",
    faq: [
      { q: "Golf Galaxy same card?", a: "DICK'S gift cards typically work at Golf Galaxy — verify card terms." },
      { q: "Sell e-gift?", a: "Yes when unused." },
      { q: "Denominations?", a: "$100–$500 common — use calculator." },
      { q: "ScoreCard points?", a: "Earn on gift card purchases when spending, not when selling." },
    ],
    metaKeywords: ["DICK'S gift card balance", "sell DICK'S Sporting Goods card", "DICK'S gift card"],
  }),

  "jd-com-gift-cards": profile({
    slug: "jd-com-gift-cards",
    category: "marketplace",
    brand: "JD.com",
    hook:
      "JD.com gift cards (京东卡) fund purchases on China's largest online retailer — electronics, appliances, and daily essentials at competitive prices.",
    about:
      "JD.com, Inc. is a leading Chinese e-commerce company rivaling Alibaba on authentic product guarantees and logistics speed. JD E-cards (gift cards) purchase goods on JD.com and the JD app across electronics, home appliances, fashion, and groceries. CNY-denominated cards target Chinese consumers and diaspora shoppers. JD's direct retail model and same-day delivery in major Chinese cities drive loyalty. International resale of JD cards serves Chinese nationals abroad sending value home or traders arbitraging currency.",
    balanceCheck: {
      intro: "JD.com E-card balance is checked in JD account wallet after redemption.",
      steps: [
        "Log into the <strong>JD.com app</strong> or jd.com.",
        "Go to <strong>My JD → My Wallet → Gift Card/E-card</strong>.",
        "Enter E-card password to bind and view balance.",
        "JD customer service assists with binding issues.",
        "Physical card packaging shows CNY denomination before binding.",
      ],
    },
    whyWanted:
      "Chinese consumers fund JD purchases with discounted E-cards. Diaspora gift-giving to family in China uses JD credit. Electronics buyers time 618 and Singles Day sales with prepaid balance.",
    redemptionNotes:
      "CNY for JD.com China. Must bind to JD account. Region-locked to Chinese JD platform.",
    faq: [
      { q: "Sell JD.com cards outside China?", a: "Yes — GiftCard4Sale supports JD tiers when rates are live." },
      { q: "CNY payout?", a: "Payout in USDT, Naira, or Cedi at prevailing rates." },
      { q: "Physical E-cards?", a: "Yes — bind code must be unused." },
      { q: "JD vs Taobao?", a: "Separate platforms — JD cards work on JD.com only." },
    ],
    metaKeywords: ["JD.com gift card balance", "sell JD E-card", "京东卡"],
  }),

  "egifter-com-code": profile({
    slug: "egifter-com-code",
    category: "marketplace",
    brand: "eGifter",
    hook:
      "eGifter codes deliver instant digital gift cards from hundreds of brands — a marketplace middle layer popular for bulk corporate rewards and crypto trades.",
    about:
      "eGifter.com is a digital gift card marketplace selling instant email delivery codes for Amazon, Target, restaurants, and hundreds of other brands. eGifter also issues its own eGifter Rewards and promotional codes. Corporate bulk buying and bitcoin payment options (historically) made eGifter popular in P2P trading communities. Codes arrive by email with redemption instructions per underlying brand. eGifter Smart eGift Cards select from multiple merchants.",
    balanceCheck: {
      intro: "eGifter code balance depends on the underlying brand — check the specific merchant's balance portal after identifying which brand the eGifter code purchased.",
      steps: [
        "Open the eGifter purchase confirmation email.",
        "Identify the underlying brand and redemption link provided.",
        "Follow that brand's balance check process (e.g., Amazon, Target).",
        "For eGifter Smart Cards, visit the Smart Card redemption URL in email.",
        "Contact eGifter support with order ID for delivery issues.",
      ],
      tip: "Specify the underlying brand when selling an eGifter-delivered code — verification depends on the destination merchant.",
    },
    whyWanted:
      "Crypto buyers historically purchased eGifter codes for brand flexibility. Corporate reward recipients sell unwanted brand codes. Bulk discount buyers arbitrage eGifter sales into individual brand resale.",
    redemptionNotes:
      "Redeem per email instructions. eGifter codes are brand-forward — underlying terms apply. Sell unused codes only with purchase receipt.",
    faq: [
      { q: "Sell eGifter Amazon codes?", a: "Yes — treat as Amazon gift card with eGifter purchase proof." },
      { q: "eGifter Rewards points?", a: "Different from gift codes — only sell purchased gift deliverables." },
      { q: "Bulk orders?", a: "Each code trades separately unless combined denomination supported." },
      { q: "Verification?", a: "Provide eGifter order confirmation if requested." },
    ],
    metaKeywords: ["eGifter code", "sell eGifter gift card", "eGifter.com code"],
  }),
};
