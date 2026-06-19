import type { GiftCardProfile } from "../types";

/** Helper to build a profile with consistent structure. */
function profile(p: GiftCardProfile): GiftCardProfile {
  return p;
}

export const GIFT_CARD_PROFILES: Record<string, GiftCardProfile> = {
  amazon: profile({
    slug: "amazon",
    category: "marketplace",
    brand: "Amazon",
    hook:
      "Amazon dominates online retail worldwide, and its gift cards are among the most liquid cards on secondary markets. A single unused Amazon balance can pay for electronics, groceries via Whole Foods, or Prime membership renewals.",
    about:
      "Amazon.com, Inc. began as an online bookstore in 1994 and grew into the world's largest e-commerce marketplace. Amazon gift cards never expire and can be applied to millions of products across Amazon.com and affiliated regional stores including Amazon UK, DE, CA, and others depending on card origin. Cards are issued in fixed denominations or custom amounts and are redeemable at checkout by entering the claim code. Amazon also offers reloadable gift cards tied to your account balance. Because Amazon operates globally, card region matters — a US-issued card only works on Amazon.com with a US billing address. Corporate bulk gifting programs and Alexa voice shopping further cement Amazon cards as a default reward currency for employers, survey panels, and cashback apps.",
    balanceCheck: {
      intro:
        "Checking your Amazon gift card balance takes less than a minute and helps you confirm the exact amount before selling.",
      steps: [
        "Visit <strong>amazon.com/gc/redeem</strong> (or your regional Amazon domain) while signed into the account where you want to apply the balance.",
        "Enter the claim code from your email or the back of the physical card (scratch off the silver panel gently).",
        "Alternatively, go to <strong>Your Account → Gift cards balance</strong> to see applied funds after redemption.",
        "For unredeemed physical cards, call Amazon customer service at <strong>1-888-280-4331</strong> (US) with the card number ready.",
        "In the Amazon mobile app, tap the menu icon → <strong>Gift Cards</strong> → <strong>Your Balance</strong>.",
      ],
      tip: "Redeem the card to your account first if you plan to spend it; for selling, note the face value printed on the card or receipt without redeeming if the buyer requires an unused code.",
    },
    whyWanted:
      "Shoppers hunt discounted Amazon gift cards because they effectively stack savings on top of Amazon's own deals, Lightning Deals, and coupon clips. A card bought at 10–15% below face value means every Prime Day purchase, Kindle book, or household essential costs less. Resellers and arbitrage sellers use Amazon balance to source inventory. International buyers whose local Amazon store has limited selection often seek US or UK cards to access broader catalogs. Reward-program participants who earn Amazon credit through credit cards, Swagbucks, or employer incentives sometimes prefer cash and sell at a small discount. The card's universality makes it one of the highest-demand gift cards globally.",
    redemptionNotes:
      "Apply the full balance in one order or let it sit in your Amazon account — unused balance does not expire. You cannot transfer balance between Amazon regional sites (US vs UK). Subscribe & Save and digital content purchases all accept gift card funds. If selling, keep the claim code covered until trade verification completes.",
    faq: [
      {
        q: "Can I sell a partially used Amazon gift card?",
        a: "GiftCard4Sale accepts cards with remaining balance as long as you submit the exact unused amount. Fully drained cards cannot be traded.",
      },
      {
        q: "Does Amazon card region affect the rate?",
        a: "Yes. US, UK, CAD, and EUR Amazon cards have separate rate tiers. Select the correct country in our calculator for an accurate quote.",
      },
      {
        q: "Are Amazon e-gift codes accepted?",
        a: "Yes, digital e-codes delivered by email are accepted when they are unused and valid for the stated region.",
      },
      {
        q: "How long does Amazon gift card verification take?",
        a: "Most trades verify within minutes to a few hours depending on denomination and card format. High-value cards may require additional checks.",
      },
    ],
    metaKeywords: ["Amazon gift card balance check", "sell Amazon gift card Nigeria", "Amazon card to USDT"],
  }),

  itunes: profile({
    slug: "itunes",
    category: "digital",
    brand: "iTunes / Apple",
    hook:
      "iTunes and Apple gift cards unlock the entire Apple media ecosystem — App Store apps, Apple Music, iCloud storage, movies, and more. They remain one of the most traded digital gift cards year after year.",
    about:
      "Apple Inc. unified iTunes Store credit under the broader Apple Gift Card brand in many markets, though iTunes-branded cards still circulate widely. These cards fund purchases on the App Store, Apple TV, Apple Books, and subscription services tied to an Apple ID. Apple gift cards are region-locked to the country of purchase — a US card requires a US Apple ID payment profile. Denominations typically range from $10 to $200. Apple sells cards through its retail stores, website, and authorized retailers globally. Because Apple maintains strict fraud controls, card codes must be unused and the region must match exactly. Physical cards feature a peel-off label; e-codes arrive instantly by email for digital delivery.",
    balanceCheck: {
      intro: "Apple provides several official ways to verify iTunes or Apple gift card credit before you spend or sell.",
      steps: [
        "On iPhone or iPad, open the <strong>App Store</strong>, tap your profile photo, then <strong>Redeem Gift Card or Code</strong> — the balance preview appears before confirming.",
        "On Mac, open the <strong>App Store → Account → Redeem Gift Card</strong>.",
        "Visit <strong>apple.com/redeem</strong> and sign in with your Apple ID to apply or check applied balance under <strong>Payment &amp; Shipping</strong>.",
        "Call Apple Support and provide the card code for balance verification if you cannot redeem online.",
        "For unredeemed codes, inspect the email receipt or card packaging for the printed denomination — Apple codes do not expose balance without redemption on an Apple ID in some regions.",
      ],
      tip: "Never redeem an iTunes card to your personal Apple ID if you intend to sell the code — once applied, it cannot be extracted as a transferable code.",
    },
    whyWanted:
      "Apple's walled-garden ecosystem creates steady demand for discounted iTunes cards. Gamers loading in-app purchases, families managing Screen Time subscriptions, and students buying productivity apps all benefit from cheaper credit. In regions where direct Apple payment options are limited, buyers seek US or UK cards to access full App Store catalogs. Crypto-native users sometimes acquire Apple credit through P2P markets to fund iCloud or Apple One bundles without linking a bank card. Holiday gifting creates seasonal surpluses — recipients who prefer cash sell unused cards, feeding supply to discount hunters.",
    redemptionNotes:
      "Redeem to the Apple ID whose region matches the card. Credit applies automatically to the next purchase including tax. Apple One, Apple Music, and iCloud upgrades can draw from the same balance. Family Sharing does not pool gift card credit across accounts.",
    faq: [
      {
        q: "What is the difference between iTunes and Apple gift cards?",
        a: "In most current markets they fund the same Apple services. Older iTunes-branded cards still work on the App Store and media purchases tied to your Apple ID.",
      },
      {
        q: "Can I sell a UK iTunes card on GiftCard4Sale?",
        a: "Yes. Select United Kingdom in the rate calculator. UK, US, EUR, AUD, and CAD iTunes tiers are commonly supported.",
      },
      {
        q: "Do iTunes cards expire?",
        a: "Apple gift card funds do not expire after redemption. Unused codes should be sold before physical cards degrade or codes are exposed to fraud.",
      },
      {
        q: "Are scratched iTunes cards accepted?",
        a: "Physical cards must have a clearly readable code. Upload sharp photos showing the code and any required serial numbers during trade submission.",
      },
    ],
    metaKeywords: ["iTunes gift card balance", "sell iTunes card for Naira", "Apple gift card exchange"],
  }),

  "google-play": profile({
    slug: "google-play",
    category: "digital",
    brand: "Google Play",
    hook:
      "Google Play gift cards power Android app purchases, mobile games, movies, books, and even YouTube Premium subscriptions — making them essential for the world's largest mobile platform.",
    about:
      "Google Play gift cards are issued by Google LLC and redeemable exclusively through the Google Play Store app or play.google.com/redeem. Credit applies to apps, in-app purchases, movies, TV shows, ebooks, and certain subscriptions billed through Google Play. Like Apple, Google Play balances are country-specific — a US card works only with a US Google Play account payment profile. Cards are sold at supermarkets, electronics stores, and online retailers in denominations from $10 to $500. Google Play Protect and fraud monitoring mean codes must be fresh and unused for resale markets. Digital delivery codes are popular for instant gifting and corporate rewards.",
    balanceCheck: {
      intro: "Verify your Google Play balance directly on your Android device or through Google's redemption portal.",
      steps: [
        "Open the <strong>Google Play Store</strong> app on your Android phone or tablet.",
        "Tap your profile icon → <strong>Payments &amp; subscriptions → Payment methods</strong> to view current Play balance.",
        "To redeem and confirm a new code, go to <strong>play.google.com/redeem</strong> while signed into the correct Google account.",
        "Enter the gift code; Google displays the amount before final confirmation in most regions.",
        "On a computer, visit the same redeem URL while logged into the Google account matching the card's country.",
      ],
      tip: "Ensure your Google account country matches the card region. Changing Play country settings has strict limitations — mismatched regions cause redemption errors.",
    },
    whyWanted:
      "Mobile gamers chasing in-game currency, parents managing family app budgets, and streaming enthusiasts funding YouTube Premium all drive Google Play card demand. Developing markets with limited international card acceptance see strong P2P demand for US Play codes. Developers testing paid apps and students buying educational tools benefit from discounted credit. Google Play's integration with millions of apps makes these cards a flexible alternative to direct carrier billing.",
    redemptionNotes:
      "Play balance cannot be withdrawn as cash through Google — selling externally is the path to liquidity. Balance covers tax on purchases in supported regions. Subscriptions like Google One draw from Play credit when configured. Unused balance stays on the account indefinitely.",
    faq: [
      {
        q: "Can Google Play cards work on iPhone?",
        a: "Google Play credit only applies within Google's ecosystem on Android and the web Play Store. It does not work on Apple's App Store.",
      },
      {
        q: "Does GiftCard4Sale buy Google Play e-codes?",
        a: "Yes. Unused digital codes with clear region identification are accepted alongside physical cards where supported.",
      },
      {
        q: "Which Google Play regions have live rates?",
        a: "US cards are most common. Check our calculator for your specific country tier — rates update from marketplace data.",
      },
      {
        q: "Can I combine multiple Google Play codes?",
        a: "Yes on your account. When selling, submit each card separately unless combining into one trade is supported for your denomination.",
      },
    ],
    metaKeywords: ["Google Play balance check", "sell Google Play card", "Google Play to Naira"],
  }),

  "steam-wallet": profile({
    slug: "steam-wallet",
    category: "gaming",
    brand: "Steam",
    hook:
      "Steam Wallet codes are the standard currency for PC gaming's largest platform, with over 100 million active users buying games, DLC, and marketplace items daily.",
    about:
      "Steam is operated by Valve Corporation and serves as the dominant digital distribution platform for PC games. Steam Wallet gift cards and codes add funds directly to a user's Steam account for purchasing games, software, downloadable content, and in-game items across the Steam Community Market. Wallet funds are account-bound and non-refundable through Steam once redeemed. Cards are region-specific — currency and pricing follow local Steam stores (USD, EUR, GBP, etc.). Valve enforces strict geographic pricing, so a US Steam code must redeem on a US Steam account. Physical cards are sold at GameStop, Walmart, and electronics retailers; digital codes are common through Steam's own gifting system and authorized resellers.",
    balanceCheck: {
      intro: "Steam displays your wallet balance prominently once a code is redeemed, and you can verify codes before committing in some cases.",
      steps: [
        "Open the <strong>Steam client</strong> or steampowered.com and log into your account.",
        "Click your account name → <strong>Account details</strong> to see current Wallet balance.",
        "To redeem, go to <strong>Games → Redeem a Steam Wallet Code</strong> and enter the code — Steam shows the credit amount before applying.",
        "On mobile, use the Steam app → <strong>Store → Account Details → Add funds</strong>.",
        "If the code fails, verify the region printed on the card matches your Steam store country.",
      ],
      tip: "Steam support cannot transfer wallet funds between accounts or regions. Confirm region compatibility before redeeming or selling.",
    },
    whyWanted:
      "PC gamers wait for Steam seasonal sales — Summer, Winter, and publisher events — where wallet credit stretches further when bought below face value. Collectors trading CS2 skins and Team Fortress items need wallet funds for market fees. Indie game enthusiasts and bundle hunters preload wallets during promotions. Gift recipients who do not play PC games often sell Steam cards to fund other expenses. Regional price differences create arbitrage interest in US and EU wallet codes.",
    redemptionNotes:
      "Wallet credit cannot be converted back to cash through Steam. Funds work for games, DLC, and Community Market purchases where enabled. Some countries restrict Market access. Steam Family sharing does not share wallet balances.",
    faq: [
      {
        q: "Can I sell a Steam Wallet code without redeeming it?",
        a: "Yes — that is preferred. Provide the unused code and region. Redeemed wallet balance cannot be sold as a code.",
      },
      {
        q: "Which Steam regions does GiftCard4Sale support?",
        a: "US, EUR, GBP, CAD, AUD, and other tiers appear in our calculator when marketplace rates are available.",
      },
      {
        q: "Do Steam Wallet codes expire?",
        a: "Unused Steam codes generally do not expire, but always trade promptly to avoid code exposure or policy changes.",
      },
      {
        q: "Are Steam digital gifts the same as wallet codes?",
        a: "Game gifts differ from wallet codes. We buy wallet top-up codes — specify the product type when opening your trade.",
      },
    ],
    metaKeywords: ["Steam Wallet balance", "sell Steam gift card", "Steam card to USDT"],
  }),

  xbox: profile({
    slug: "xbox",
    category: "gaming",
    brand: "Xbox",
    hook:
      "Xbox gift cards fund Game Pass subscriptions, full game downloads, add-ons, and movies across Xbox consoles and Windows PCs — anchoring Microsoft's gaming ecosystem.",
    about:
      "Microsoft issues Xbox gift cards redeemable on Xbox consoles, the Xbox app for PC, and Microsoft account balances used for digital purchases. Credit applies to Xbox Game Pass Ultimate, individual game purchases on the Microsoft Store, in-game content, and entertainment rentals. Xbox cards are region-locked to specific Microsoft storefronts (US, UK, EU, etc.). The shift toward subscription gaming through Game Pass has increased card demand significantly. Cards are available physically and as digital codes from Microsoft, Amazon, Best Buy, and gaming retailers worldwide. Microsoft account balances can also fund some Windows Store apps, broadening utility beyond console gaming.",
    balanceCheck: {
      intro: "Microsoft makes it easy to check and redeem Xbox gift card credit through console, PC, or web.",
      steps: [
        "On Xbox Series X|S or Xbox One, press the <strong>Xbox button → Store → Use a code</strong>.",
        "On PC, open the <strong>Xbox app</strong> or visit <strong>account.microsoft.com/billing/redeem</strong>.",
        "Sign in with the Microsoft account tied to your Xbox profile.",
        "Enter the 25-character code; Microsoft displays the credit value before confirmation.",
        "View total balance at <strong>account.microsoft.com → Payment &amp; billing → Account balance</strong>.",
      ],
      tip: "Game Pass renewals automatically draw from Microsoft account balance if configured — check billing settings before redeeming if you plan to sell instead.",
    },
    whyWanted:
      "Game Pass Ultimate is one of gaming's best values, and discounted Xbox credit effectively reduces subscription costs. Parents use Xbox cards for parental-controlled spending on Fortnite V-Bucks and Minecraft coins. Holiday console bundles include gift cards that some recipients convert to cash. Cross-platform play on PC and Xbox means Windows gamers also seek Xbox credit for Microsoft Store titles.",
    redemptionNotes:
      "One Microsoft account balance serves Xbox and select Windows Store purchases. Credit does not expire. Cannot be used for physical hardware purchases. Stack multiple codes on one account before major game launches.",
    faq: [
      {
        q: "Do Xbox cards work for PC Game Pass?",
        a: "Yes. Redeeming to your Microsoft account funds Game Pass on both Xbox and PC where available in your region.",
      },
      {
        q: "Can I sell UK Xbox gift cards?",
        a: "Yes — select the correct region in our rate calculator. UK, US, and EUR Xbox tiers are commonly traded.",
      },
      {
        q: "Are Xbox Live Gold cards the same as Xbox gift cards?",
        a: "Older Live Gold cards may differ. Standard Xbox gift cards fund your Microsoft account balance broadly.",
      },
      {
        q: "Does GiftCard4Sale accept Xbox e-codes?",
        a: "Yes, unused digital codes with matching region are accepted when rates are listed for that tier.",
      },
    ],
    metaKeywords: ["Xbox gift card balance", "sell Xbox card Nigeria", "Xbox Game Pass gift card"],
  }),

  "playstation-network": profile({
    slug: "playstation-network",
    category: "gaming",
    brand: "PlayStation",
    hook:
      "PlayStation Network (PSN) cards unlock games, PlayStation Plus subscriptions, and digital content for millions of PS5 and PS4 owners worldwide.",
    about:
      "Sony Interactive Entertainment issues PlayStation Store gift cards redeemable on PSN for games, add-ons, themes, and PlayStation Plus memberships. PSN wallets are region-locked — US cards require a US PSN account with matching store region. Denominations range from $10 to $100 in most markets. PlayStation's exclusive titles and online multiplayer requirements drive consistent card demand. Cards are sold at gaming retailers, supermarkets, and digital storefronts. Sony strictly monitors fraud on high-value codes, making accurate region reporting essential for resale.",
    balanceCheck: {
      intro: "Check and redeem PSN credit directly on your PlayStation console or through Sony's account management site.",
      steps: [
        "On PS5, go to <strong>Settings → Users and Accounts → Payment and Subscriptions → Redeem Codes</strong>.",
        "On PS4, navigate to the <strong>PlayStation Store → Redeem Codes</strong> at the bottom of the sidebar.",
        "Visit <strong>store.playstation.com</strong>, sign in, and click your avatar → <strong>Redeem Code</strong>.",
        "Enter the 12-digit code; Sony shows the wallet credit amount for your region.",
        "View wallet balance under <strong>Account → Payment Management → PlayStation Store wallet</strong>.",
      ],
      tip: "PSN wallet funds cannot transfer between regional accounts. Create or use the PSN account matching the card's country.",
    },
    whyWanted:
      "PlayStation Plus Essential, Extra, and Premium tiers renew monthly — prepaid PSN credit bought at a discount lowers the effective subscription price. Launch-day exclusive titles encourage gamers to keep wallet funds ready. Gift cards bundled with PS5 hardware create resale supply from non-gamers. PlayStation sales events (Days of Play) reward buyers who stocked discounted credit beforehand.",
    redemptionNotes:
      "Wallet credit works for games, DLC, and subscriptions billed through PSN. Cannot purchase physical accessories. Unused wallet balance persists on the account. Share Play does not share wallet funds between accounts.",
    faq: [
      {
        q: "Can PlayStation cards fund PlayStation Plus?",
        a: "Yes. PS Plus renewals charge your PSN wallet first if sufficient balance exists.",
      },
      {
        q: "Which PSN regions are supported for selling?",
        a: "US cards are most common on GiftCard4Sale. Check the calculator for your card's country tier.",
      },
      {
        q: "Are PSN cards the same as PlayStation Store gift cards?",
        a: "Yes — they add funds to your PSN wallet for digital PlayStation Store purchases.",
      },
      {
        q: "Can I sell a partially redeemed PSN card?",
        a: "Only unused full codes or cards with verifiable remaining balance can be traded. Redeemed wallet funds are not sellable as codes.",
      },
    ],
    metaKeywords: ["PSN gift card balance", "sell PlayStation card", "PSN card to Naira"],
  }),

  doordash: profile({
    slug: "doordash",
    category: "food",
    brand: "DoorDash",
    hook:
      "DoorDash gift cards cover restaurant delivery, groceries through DashMart, and even alcohol in eligible markets — perfect for food lovers who want flexible dining credit.",
    about:
      "DoorDash, Inc. operates one of North America's largest food delivery platforms, connecting customers with restaurants, convenience stores, and grocery partners. DoorDash gift cards redeem toward orders on the DoorDash app or website, covering food subtotals, fees, and tips in supported regions. Cards are primarily US-focused though corporate gifting programs expand availability. Denominations typically range from $25 to $200. DoorDash cards do not expire under normal terms. Digital codes deliver instantly; physical cards appear at retailers like Target, Walmart, and CVS. The company's DashPass subscription can also be funded indirectly through order credit.",
    balanceCheck: {
      intro: "DoorDash keeps gift card balance management inside the mobile app and website account settings.",
      steps: [
        "Open the <strong>DoorDash app</strong> and tap your profile icon.",
        "Go to <strong>Account → Gift Card</strong> or <strong>Payment Methods</strong>.",
        "Tap <strong>Redeem Gift Card</strong> and enter the code from your email or physical card.",
        "Applied balance appears at checkout automatically on eligible orders.",
        "For unredeemed cards, the face value is printed on the packaging — DoorDash does not offer phone balance lookup for unredeemed third-party cards in all cases.",
      ],
      tip: "Gift card credit applies to subtotal and fees but check current terms for alcohol, gift orders, and DashPass billing.",
    },
    whyWanted:
      "Food delivery adds up quickly — discounted DoorDash cards stretch weekly meal budgets for students, remote workers, and busy families. Corporate thank-you gifts sometimes land with recipients who prefer cash. DashPass subscribers offset delivery fees using prepaid credit bought below face value. Group ordering and office lunch coordinators bulk-buy discounted cards for team meals.",
    redemptionNotes:
      "Apply credit at checkout; it combines with promotions in most cases. Cards are US-market focused — verify regional acceptance. Cannot convert DoorDash balance to bank withdrawal directly; selling externally provides liquidity.",
    faq: [
      {
        q: "Can I sell a DoorDash e-gift code?",
        a: "Yes. Submit the unused code with the correct denomination. Physical and digital formats are accepted when rates are available.",
      },
      {
        q: "Do DoorDash gift cards expire?",
        a: "Standard DoorDash gift cards do not expire. Trade unused cards promptly for best rates.",
      },
      {
        q: "Does DoorDash credit work for grocery delivery?",
        a: "Yes, on eligible DashMart and grocery partner orders within the DoorDash app.",
      },
      {
        q: "What denominations does GiftCard4Sale accept for DoorDash?",
        a: "Common tiers include $100–$500 ranges. Enter your exact face value in the calculator for a live quote.",
      },
    ],
    metaKeywords: ["DoorDash gift card balance", "sell DoorDash card", "DoorDash to Naira"],
  }),

  sephora: profile({
    slug: "sephora",
    category: "fashion",
    brand: "Sephora",
    hook:
      "Sephora gift cards open access to premium beauty — from Charlotte Tilbury to Fenty Beauty — making them a top choice for cosmetics enthusiasts and gift-givers alike.",
    about:
      "Sephora, owned by LVMH, is a leading global beauty retailer operating standalone stores and shop-in-shops worldwide. Sephora gift cards purchase makeup, skincare, fragrance, haircare, and tools both in-store and at Sephora.com. The Beauty Insider loyalty program integrates with gift card purchases, though points accrue on the post-redemption transaction. Cards come in elegant physical packaging and instant e-delivery formats from $10 to $500. Sephora cards work at US and Canada locations; international Sephora operations may have separate programs. The retailer accepts returns on gift card purchases under standard policy, protecting buyers who receive unwanted gifts.",
    balanceCheck: {
      intro: "Sephora offers online and in-store balance lookup for gift cards tied to their US and Canada operations.",
      steps: [
        "Visit <strong>sephora.com/giftcards</strong> and click <strong>Check Balance</strong>.",
        "Enter the card number and PIN from the back of your physical card.",
        "In store, any cashier can scan the card and report the remaining balance.",
        "For e-gift cards, open the Sephora app → <strong>Account → Gift Cards</strong> to redeem and view balance.",
        "Call Sephora Customer Service at <strong>1-877-737-4672</strong> with card details for phone verification.",
      ],
      tip: "Keep the PIN scratch panel intact until verification. Sephora cannot recover balance from lost cards without proof of purchase.",
    },
    whyWanted:
      "Beauty enthusiasts stack Sephora gift cards with sale events like the Sephora Savings Event for maximum value. Discounted cards effectively reduce the cost of high-end serums and limited-edition collaborations. Gift recipients who prefer cash over cosmetics sell cards at modest discounts. Influencers and content creators funding product reviews seek affordable Sephora credit. Holiday and Valentine's gifting creates seasonal supply on secondary markets.",
    redemptionNotes:
      "Use online or in-store — same card works both channels. Combine up to two gift cards per online order. Cannot buy other gift cards with Sephora credit. Beauty Insider points earned on purchases after gift card application.",
    faq: [
      {
        q: "Can I sell a Sephora gift card with partial balance?",
        a: "Yes if the remaining balance is verifiable. Enter the exact unused amount in our calculator.",
      },
      {
        q: "Are Sephora e-gift cards accepted?",
        a: "Yes. Digital codes from Sephora.com or authorized sellers are welcome when unused.",
      },
      {
        q: "Do Sephora cards work in Canada?",
        a: "US and Canada Sephora cards are region-specific. Confirm your card origin before selling.",
      },
      {
        q: "What rate will I get for my Sephora card?",
        a: "Rates depend on denomination and market demand. Use the live calculator on this page for today's quote in Naira, Cedi, or USDT.",
      },
    ],
    metaKeywords: ["Sephora gift card balance", "sell Sephora card", "Sephora card Nigeria"],
  }),

  nike: profile({
    slug: "nike",
    category: "fashion",
    brand: "Nike",
    hook:
      "Nike gift cards fuel sneaker culture — from Air Jordan retros to everyday running gear — and rank among the most sought-after athletic retail cards globally.",
    about:
      "Nike, Inc. is the world's largest athletic footwear and apparel company, headquartered in Beaverton, Oregon. Nike gift cards redeem at Nike retail stores, Nike.com, and the Nike app for shoes, clothing, and equipment. SNKRS app releases for limited Jordans and Dunks drive intense demand for Nike credit. Cards are sold in physical and digital formats across North America, Europe, and select Asia-Pacific markets. Nike gift cards typically do not expire. The company also issues Converse cards separately — ensure your card branding reads Nike. Corporate wellness programs and sports team sponsorships frequently distribute Nike gift cards as incentives.",
    balanceCheck: {
      intro: "Nike provides straightforward balance checking for both online and retail gift cards.",
      steps: [
        "Go to <strong>nike.com/gift-cards/check-balance</strong>.",
        "Enter your card number and PIN (eight digits on the back of physical cards).",
        "In Nike retail stores, associates can scan the card at checkout to report balance.",
        "In the Nike app, add the gift card under <strong>Profile → Payment → Gift Cards</strong>.",
        "For Nike e-gift cards, the email confirmation includes the card number and PIN for balance lookup.",
      ],
      tip: "SNKRS purchases accept Nike gift card balance — preload before major drops if you plan to spend rather than sell.",
    },
    whyWanted:
      "Sneakerheads hunting limited releases use discounted Nike credit to lower effective retail prices on grail pairs. Athletes restocking training gear benefit from below-face-value cards. Gift cards from holidays and birthdays often go unused by non-runners who prefer cash. International buyers accessing US-exclusive Nike.com colorways seek US-denominated cards. Resale market liquidity makes Nike cards easy to move at competitive discounts.",
    redemptionNotes:
      "Nike gift cards work on Nike.com and factory stores unless terms specify otherwise. Cannot purchase other gift cards. Combine multiple cards on one order. SNKRS and Nike.com share the same wallet when linked to your Nike Member account.",
    faq: [
      {
        q: "Can I sell a Nike SNKRS-eligible gift card?",
        a: "Yes — any unused Nike gift card with verifiable balance qualifies. SNKRS eligibility is a spending benefit, not a separate product.",
      },
      {
        q: "Does GiftCard4Sale buy Nike e-gift cards?",
        a: "Yes. Digital Nike codes with clear denomination and unused status are accepted.",
      },
      {
        q: "Are Nike cards region-locked?",
        a: "US Nike cards work on Nike.com US. Confirm your card's purchase country for accurate rate quoting.",
      },
      {
        q: "Can I combine Nike gift cards when selling?",
        a: "Submit each card as a separate trade unless your total matches a supported denomination tier in the calculator.",
      },
    ],
    metaKeywords: ["Nike gift card balance check", "sell Nike gift card", "Nike card to Naira"],
  }),

  visa: profile({
    slug: "visa",
    category: "prepaid",
    brand: "Visa",
    hook:
      "Visa prepaid gift cards spend anywhere Visa debit is accepted — millions of merchants worldwide — making them one of the most flexible gift card types to hold or sell.",
    about:
      "Visa Inc. operates the world's largest payment network, and Visa-branded gift cards are issued by partner banks and program managers (not Visa directly). These prepaid cards carry fixed balances usable wherever Visa is accepted online and in-store, subject to issuer terms. Common US issuers include MetaBank, Sutton Bank, and regional banks packaging cards for supermarkets and drugstores. Activation at purchase is required for most physical cards. Visa gift cards may charge monthly maintenance fees after 12 months in some programs — check issuer terms on the card packaging. Vanilla Visa and other open-loop cards dominate P2P trading due to broad acceptance.",
    balanceCheck: {
      intro: "Visa gift card balance checks go through the issuing bank's website printed on the card back, not Visa.com directly.",
      steps: [
        "Flip the card and locate the issuer website or phone number (often <strong>MyGiftCardBalance.com</strong>, <strong>VanillaGift.com</strong>, or similar).",
        "Enter the 16-digit card number, expiration date, and CVV.",
        "Some issuers require online registration before first use — complete registration to unlock full balance inquiry.",
        "Call the toll-free number on the card back for automated balance information.",
        "At retail, some POS systems can query remaining balance before purchase — ask the cashier.",
      ],
      tip: "Note the specific issuer program (Vanilla, Gift Card Mall, etc.) — GiftCard4Sale rates may vary by card program and activation status.",
    },
    whyWanted:
      "Open-loop Visa cards function like portable debit — ideal for online shopping where store-specific cards fail. Budget-conscious shoppers buy discounted Visa cards for everyday purchases at grocery, gas, and big-box stores. Travelers use US Visa gift cards for hotel holds and car rentals when avoiding personal card exposure. Freelancers receiving Visa cards as payment convert them to cash through resale. Broad merchant acceptance creates deeper discount markets than closed-loop retail cards.",
    redemptionNotes:
      "Register the card with your billing ZIP code for online purchases. Cannot withdraw cash at ATMs on standard gift cards (unless explicitly a prepaid debit variant). Partial balances remain until fees deplete them — spend or sell before inactivity fees apply.",
    faq: [
      {
        q: "Does GiftCard4Sale buy Vanilla Visa cards?",
        a: "Yes when rates are listed. Vanilla and standard Visa prepaid tiers appear in our calculator for supported denominations.",
      },
      {
        q: "Must Visa gift cards be activated?",
        a: "Yes. Only activated cards with verifiable balance are accepted. Provide activation receipt if requested during verification.",
      },
      {
        q: "Can I sell a Visa card with partial balance?",
        a: "Yes — enter the exact remaining balance. Fully drained cards cannot be traded.",
      },
      {
        q: "Why do Visa gift card rates differ from retail cards?",
        a: "Market demand, verification complexity, and issuer program affect pricing. Our calculator reflects live marketplace rates.",
      },
    ],
    metaKeywords: ["Visa gift card balance", "sell Vanilla Visa", "Visa prepaid card to USDT"],
  }),

  ebay: profile({
    slug: "ebay",
    category: "marketplace",
    brand: "eBay",
    hook:
      "eBay gift cards unlock the world's largest online auction and marketplace — from vintage collectibles to brand-new electronics — with over a billion active listings.",
    about:
      "eBay Inc., founded in 1995, pioneered online person-to-person commerce and remains a global marketplace for new and used goods. eBay gift cards fund purchases on ebay.com including auctions, Buy It Now listings, and eBay Motors parts. Cards cannot be used for PayPal withdrawals or seller fees in most cases — they are buyer-focused spending credit. eBay cards are primarily US-denominated though international eBay sites may offer regional variants. Digital delivery and physical cards range from $25 to $500. eBay's buyer protection programs apply to gift card purchases like any other transaction.",
    balanceCheck: {
      intro: "eBay provides a dedicated gift card balance portal for quick verification.",
      steps: [
        "Visit <strong>ebay.com/giftcardbalance</strong> or <strong>giftcards.ebay.com</strong>.",
        "Enter the 13-digit redemption code and the PIN if required.",
        "Signed-in users can also redeem under <strong>My eBay → Wallet → Gift cards</strong>.",
        "Applied balance shows at checkout when paying for eligible items.",
        "Customer service can assist with balance disputes if you have proof of purchase and the redemption code.",
      ],
      tip: "eBay gift cards cannot purchase other gift cards or be redeemed for cash on eBay — external resale is the path to convert to Naira, Cedi, or USDT.",
    },
    whyWanted:
      "Collectors sourcing rare coins, trading cards, and vintage electronics use discounted eBay credit to win auctions with lower effective bids. Small business resellers stocking inventory benefit from below-face-value marketplace credit. Gift recipients who do not shop online sell eBay cards for immediate cash. Seasonal promotions and eBay Bucks alternatives keep gift card demand steady.",
    redemptionNotes:
      "Apply at checkout on eligible listings. Some categories (real estate, vehicles) may restrict gift card use. Combine one gift card with other payment methods for larger purchases. Balance persists on the account until spent.",
    faq: [
      {
        q: "Can I sell an eBay gift card I received by email?",
        a: "Yes. Forward the unused e-code details securely during trade submission.",
      },
      {
        q: "Are eBay cards US-only?",
        a: "Most traded cards are US eBay. Confirm the card's purchase region before calculating your rate.",
      },
      {
        q: "Do eBay gift cards expire?",
        a: "eBay gift cards typically do not expire. Sell unused cards promptly for current market rates.",
      },
      {
        q: "Can partial eBay balances be sold?",
        a: "Yes with verifiable remaining balance. Enter the exact amount in our calculator.",
      },
    ],
    metaKeywords: ["eBay gift card balance", "sell eBay gift card", "eBay card Nigeria"],
  }),

  gamestop: profile({
    slug: "gamestop",
    category: "gaming",
    brand: "GameStop",
    hook:
      "GameStop gift cards are gaming culture staples — usable for new releases, pre-owned titles, collectibles, and console accessories at thousands of stores and online.",
    about:
      "GameStop Corp. is a specialty retailer focused on video games, consumer electronics, and gaming merchandise with stores across the United States and e-commerce at GameStop.com. GameStop gift cards purchase games for all major platforms, gaming accessories, Funko Pop collectibles, and apparel. The company's PowerUp Rewards program integrates with gift card purchases. Cards are sold in-store and online in standard denominations. GameStop's trade-in program is separate from gift cards — cards fund new purchases rather than trade credit directly. Digital codes and physical cards both circulate on secondary markets, especially during holiday console bundle promotions.",
    balanceCheck: {
      intro: "GameStop makes balance checks available online and at any retail location.",
      steps: [
        "Visit <strong>gamestop.com/giftcards</strong> and select <strong>Check Balance</strong>.",
        "Enter the 19-digit card number and 4-digit PIN from the back of the card.",
        "In any GameStop store, ask an associate to scan the card at the register.",
        "For digital codes, the confirmation email includes redemption details and denomination.",
        "GameStop customer service at <strong>1-800-883-8895</strong> can verify balance with card information.",
      ],
      tip: "GameStop gift cards work online and in-store interchangeably — same balance pool.",
    },
    whyWanted:
      "Launch-day game buyers preload GameStop credit during buy-two-get-one sales for extra savings when cards are discounted. Collectors hunting exclusive GameStop editions seek prepaid balance. Parents managing kids' gaming spending buy discounted cards for controlled budgets. Holiday gift cards from relatives often convert to cash through resale platforms.",
    redemptionNotes:
      "Redeem online at checkout or present in-store. Cannot buy other gift cards in most cases. Combine with PowerUp Pro discounts for stacked savings if spending rather than selling.",
    faq: [
      {
        q: "Does GiftCard4Sale accept GameStop digital codes?",
        a: "Yes when unused and verifiable. Physical and e-code formats are supported at listed rates.",
      },
      {
        q: "What denominations are common for GameStop cards?",
        a: "$100–$500 tiers are frequently traded. Enter your exact face value for a live quote.",
      },
      {
        q: "Can I sell a GameStop card with partial balance?",
        a: "Yes — verify the remaining balance online first and submit the accurate amount.",
      },
      {
        q: "Are GameStop cards US-only?",
        a: "Primarily US GameStop. Confirm card origin for accurate rate selection.",
      },
    ],
    metaKeywords: ["GameStop gift card balance", "sell GameStop card", "GameStop to Naira"],
  }),

  nordstrom: profile({
    slug: "nordstrom",
    category: "fashion",
    brand: "Nordstrom",
    hook:
      "Nordstrom gift cards deliver access to premium fashion, beauty, and home goods — from designer labels to Nordstrom Rack bargains — across a beloved American department store chain.",
    about:
      "Nordstrom, Inc. operates upscale department stores and the off-price Nordstrom Rack chain across the United States and Canada. Nordstrom gift cards redeem at full-line stores, Nordstrom Rack, Nordstrom.com, and Nordstrom Local service hubs. The retailer is known for generous return policies and free alterations on many purchases. Cards never expire under standard terms and ship in signature Nordstrom packaging or as instant e-gifts. Nordstrom Rack accepts the same gift cards as mainline stores, effectively stretching credit across price points. The Nordy Club loyalty program awards points on purchases made with gift cards.",
    balanceCheck: {
      intro: "Nordstrom offers online balance lookup and in-store verification for all gift cards.",
      steps: [
        "Visit <strong>nordstrom.com/browse/customer-service/gift-card/check-balance</strong>.",
        "Enter the card number and access code (PIN) from the back.",
        "In any Nordstrom or Rack store, cashiers scan cards at checkout for balance.",
        "Nordstrom app users can add gift cards under wallet settings after signing in.",
        "Call Nordstrom Customer Care for phone balance assistance with card details ready.",
      ],
      tip: "Nordstrom Rack purchases accept standard Nordstrom gift cards — one card covers both luxury and off-price shopping.",
    },
    whyWanted:
      "Fashion-forward shoppers time Anniversary Sale and Half-Yearly Sale events with discounted Nordstrom credit for designer deals. Wedding registry surplus and corporate gifts create resale supply. International shoppers without US credit cards seek Nordstrom gift cards for US online orders. Off-price hunters use the same credit at Rack for steeper discounts on clearance merchandise.",
    redemptionNotes:
      "Use at Nordstrom, Nordstrom Rack, and online. Cannot redeem for cash at registers. Combine multiple gift cards on single orders. Alterations and services accept gift card payment.",
    faq: [
      {
        q: "Can Nordstrom Rack gift cards differ from Nordstrom cards?",
        a: "Standard Nordstrom gift cards work at both.full-line and Rack locations.",
      },
      {
        q: "Does GiftCard4Sale buy Nordstrom e-gift cards?",
        a: "Yes. Unused digital codes with verifiable denomination are accepted.",
      },
      {
        q: "What face values are common?",
        a: "$100–$300 Nordstrom cards trade frequently. Use our calculator for your specific amount.",
      },
      {
        q: "Do Nordstrom gift cards expire?",
        a: "No expiration under normal terms. Sell unused cards anytime for Naira, Cedi, or USDT.",
      },
    ],
    metaKeywords: ["Nordstrom gift card balance", "sell Nordstrom card", "Nordstrom card exchange"],
  }),
};
