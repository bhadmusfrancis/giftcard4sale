import type { GiftCardProfile } from "../types";

function p(
  slug: string,
  category: GiftCardProfile["category"],
  brand: string,
  data: Omit<GiftCardProfile, "slug" | "category" | "brand">
): GiftCardProfile {
  return { slug, category, brand, ...data };
}

/** Brand-specific profiles for inactive / catalog card types. */
export const INACTIVE_PROFILES: Record<string, GiftCardProfile> = {
  walmart: p("walmart", "retail", "Walmart", {
    hook: "Walmart gift cards spend at America's largest retailer — groceries, electronics, pharmacy, and auto care at more than 4,600 US stores and Walmart.com.",
    about: "Walmart Inc. operates supercenters, Neighborhood Markets, and Sam's Club-adjacent competition across the United States as the world's largest company by revenue. Walmart gift cards purchase everything from weekly groceries and household essentials to TVs, tires, and back-to-school supplies online and in-store. Walmart+ membership fees and pickup orders accept gift card payment in supported flows. Cards never expire under standard US terms and sell at thousands of checkout lanes nationwide. The retailer's everyday low price strategy makes Walmart cards among the most universally useful closed-loop gift cards in North America.",
    balanceCheck: { intro: "Walmart provides online and in-store gift card balance lookup.", steps: ["Visit walmart.com/account/giftcards/balance", "Enter the 16-digit card number and PIN", "In store, cashiers scan at any register", "Walmart app → Account → Gift cards", "Call 1-888-537-5503 for automated balance"] },
    whyWanted: "Budget-conscious families stretch grocery and household budgets with discounted Walmart cards. Back-to-school and holiday shoppers preload credit before sales. SNAP-eligible grocery purchases and rollback pricing stack with below-face-value gift cards for maximum savings.",
    redemptionNotes: "Valid at US Walmart stores and walmart.com. Cannot buy other gift cards in most cases. Sam's Club cards are separate.",
    faq: [{ q: "Can I sell Walmart gift cards on GiftCard4Sale?", a: "Yes — unused US Walmart cards are accepted when rates appear in our calculator." }, { q: "Walmart Visa vs Walmart store card?", a: "Store cards spend at Walmart only; Walmart Visa is open-loop — specify which you have." }, { q: "Partial balance?", a: "Yes with verified remaining amount." }, { q: "Do Walmart cards expire?", a: "No expiration on standard Walmart gift cards." }],
    metaKeywords: ["Walmart gift card balance", "sell Walmart card", "Walmart to Naira"],
  }),

  target: p("target", "retail", "Target", {
    hook: "Target gift cards unlock a curated big-box experience — style, home, groceries through Target Circle, and exclusive designer collaborations at 1,900+ US stores.",
    about: "Target Corporation is a general merchandise retailer known for affordable fashion, home décor, and a growing grocery business through its owned brands. Target gift cards redeem at Target stores and Target.com for clothing, electronics, baby gear, and Starbucks cafés inside locations. Target Circle rewards integrate with gift card purchases. RedCard holders get extra savings but gift cards work independently. Digital and physical cards range from $10 to $500. Target's seasonal collections and Drive Up pickup make gift cards practical for busy suburban shoppers.",
    balanceCheck: { intro: "Target gift card balance checks are quick online or in-store.", steps: ["Go to target.com/guest/gift-card-balance", "Enter card number and access PIN", "Target app → Wallet → Gift cards", "Any Target cashier can scan your card", "Call 1-800-544-2947 for phone balance"] },
    whyWanted: "Target Circle Week and holiday toy sales drive demand for discounted Target credit. College dorm shoppers and registry recipients convert unused cards to cash. Designer collaboration drops encourage prepaid spending.",
    redemptionNotes: "US Target only. Works on Target.com with free Drive Up. Cannot redeem for cash at registers.",
    faq: [{ q: "Sell Target e-gift cards?", a: "Yes when unused and verifiable." }, { q: "Target Visa cards?", a: "Open-loop Target Visa differs from store cards — check your card type." }, { q: "Do Target cards expire?", a: "No fees or expiration on standard Target gift cards." }, { q: "Rates available?", a: "Check our live calculator — availability depends on marketplace demand." }],
    metaKeywords: ["Target gift card balance", "sell Target card", "Target gift card Nigeria"],
  }),

  netflix: p("netflix", "digital", "Netflix", {
    hook: "Netflix gift cards pay for streaming subscriptions — movies, series, and documentaries — without linking a credit card to the world's leading entertainment platform.",
    about: "Netflix, Inc. operates a global subscription streaming service with over 250 million paid memberships producing original films, series, and licensed content across genres. Netflix gift cards and prepaid codes add credit to a Netflix account for Standard, Premium, or Basic plans depending on region. US cards redeem at netflix.com/redeem. Cards are sold at supermarkets, drugstores, and online retailers in fixed denominations. Netflix gift balance applies before billing a card on file. Regional restrictions apply — US codes require US Netflix accounts.",
    balanceCheck: { intro: "Redeem and view Netflix gift balance through your account settings.", steps: ["Visit netflix.com/redeem while signed in", "Enter the 11-digit PIN from your card or email", "Go to Account → Membership & billing to see applied credit", "Unused physical cards show denomination on packaging", "Netflix Help Center assists with invalid codes"] },
    whyWanted: "Cord-cutters fund ad-free streaming at a discount. Parents control teen viewing budgets with prepaid Netflix credit. Gift subscriptions from relatives convert to cash when recipients already have accounts.",
    redemptionNotes: "Region-locked to account country. Credit applies to monthly plans; cannot buy Netflix merchandise. Auto-renewal draws from balance first.",
    faq: [{ q: "Can I sell Netflix codes?", a: "Yes — unused US Netflix PINs when rates are listed." }, { q: "Netflix subscription vs gift card?", a: "Gift cards add account credit; they are not the same as gifted subscriptions." }, { q: "International Netflix?", a: "Cards are region-specific — US cards for US accounts." }, { q: "Partial PIN value?", a: "Sell unused full codes only." }],
    metaKeywords: ["Netflix gift card redeem", "sell Netflix card", "Netflix PIN balance"],
  }),

  uber: p("uber", "travel", "Uber", {
    hook: "Uber gift cards cover rides, Uber Eats delivery, and premium services across the Uber app — flexible urban transportation and food credit in one wallet.",
    about: "Uber Technologies, Inc. operates ride-hailing, food delivery through Uber Eats, and freight services globally. Uber gift cards add credit to your Uber account for rides, Uber Eats orders, and Uber Premium where available. US cards redeem in the Uber or Uber Eats app under Wallet → Add funds → Gift card. Credit does not expire in most US markets. Uber gift cards are popular corporate perks and birthday gifts in cities with strong Uber presence. Uber One membership may draw from gift balance depending on billing settings.",
    balanceCheck: { intro: "Uber gift card balance appears in the app wallet after redemption.", steps: ["Open Uber or Uber Eats app → Account → Wallet", "Tap Add payment method → Gift card", "Enter code from email or physical card", "Balance shows under Uber Cash", "Support.uber.com for code issues with receipt"] },
    whyWanted: "City commuters reduce ride costs with discounted Uber credit. Uber Eats regulars fund delivery without personal cards. Corporate ride credits convert to cash via resale when employees prefer other transport.",
    redemptionNotes: "Apply automatically on next ride or Eats order. Region-specific. Cannot withdraw Uber Cash to bank — sell externally for liquidity.",
    faq: [{ q: "Uber vs Uber Eats cards?", a: "Standard Uber gift cards fund both rides and Eats in the same wallet." }, { q: "Sell Uber e-gifts?", a: "Yes when unused." }, { q: "International Uber?", a: "US cards for US Uber accounts." }, { q: "Partial balance sellable?", a: "Yes with verified Uber Cash balance if policy allows." }],
    metaKeywords: ["Uber gift card balance", "sell Uber card", "Uber Cash"],
  }),

  "uber-eats": p("uber-eats", "food", "Uber Eats", {
    hook: "Uber Eats gift cards fund restaurant delivery, grocery orders, and alcohol delivery in eligible markets — hot meals from local favorites to your door.",
    about: "Uber Eats is Uber's food delivery platform connecting customers with restaurants, convenience stores, and grocery partners. Uber Eats gift cards typically redeem into shared Uber Cash usable on Eats orders and rides. The app operates in thousands of cities worldwide with US cards most common in resale. Delivery fees, tips, and service charges can draw from gift balance at checkout. Uber Eats Pass subscribers may offset membership costs using prepaid credit.",
    balanceCheck: { intro: "Redeem Uber Eats gift codes through the Uber Eats app wallet.", steps: ["Open Uber Eats → Account → Wallet", "Select Redeem gift card", "Enter code from purchase email", "Balance applies at checkout on next order", "Same codes often work in main Uber app"] },
    whyWanted: "Food delivery adds up — discounted Uber Eats credit lowers weekly meal spending. Office lunch coordinators bulk-buy cards. Non-delivery users sell gifted Eats credit for cash.",
    redemptionNotes: "Uber Cash wallet shared with Uber rides in US. Alcohol and age-restricted orders follow local law.",
    faq: [{ q: "Uber Eats-only cards?", a: "Most Uber gift products fund shared Uber Cash for Eats and rides." }, { q: "Sell unused codes?", a: "Yes when rates are available." }, { q: "Do codes expire?", a: "Uber Cash typically does not expire — check regional terms." }, { q: "GiftCard4Sale payout?", a: "USDT, Naira, or Cedi per calculator quote." }],
    metaKeywords: ["Uber Eats gift card", "sell Uber Eats code", "Uber Eats balance"],
  }),

  roblox: p("roblox-game-card", "gaming", "Roblox", {
    hook: "Roblox Game Cards convert to Robux for avatar items, game passes, and experiences on a platform with hundreds of millions of monthly active players.",
    about: "Roblox Corporation hosts a user-generated gaming platform where Robux purchases unlock cosmetics, developer products, and premium experiences. Roblox Game Cards sold at retail redeem at roblox.com/redeem into account-bound Robux. Denominations from $10 to $200 target young gamers and parental gifting. Roblox Premium subscriptions can bundle Robux monthly. Unused game cards are the only sellable format — redeemed Robux cannot transfer between accounts.",
    balanceCheck: { intro: "Roblox shows Robux balance after redeeming a game card PIN.", steps: ["Log into roblox.com/redeem", "Enter PIN from card back or digital receipt", "Robux credits instantly to logged-in account", "Mobile app → More → Redeem Gift Card", "Face value printed on unredeemed packaging"] },
    whyWanted: "Parents cap kids' Robux spending with prepaid cards bought below face value. Creators funding dev products seek affordable Robux. Birthday gifts convert to Naira or USDT via resale.",
    redemptionNotes: "Redeem only at roblox.com/redeem. Robux is non-refundable through Roblox. Premium membership bundles vary by region.",
    faq: [{ q: "Roblox Game Card vs Robux?", a: "Cards redeem into Robux — sell unused cards, not account Robux." }, { q: "Physical and digital accepted?", a: "Yes when unused." }, { q: "US cards only?", a: "Primarily US Roblox cards in trade — confirm region." }, { q: "Common amounts?", a: "$25–$200 tiers — enter exact value in calculator." }],
    metaKeywords: ["Roblox gift card balance", "sell Roblox card", "Roblox to Naira"],
  }),

  valorant: p("valorant", "gaming", "Valorant", {
    hook: "Valorant gift cards fund Valorant Points (VP) for weapon skins, battle passes, and the premium cosmetic economy in Riot Games' tactical shooter.",
    about: "Valorant is Riot Games' free-to-play 5v5 character-based tactical shooter with a cosmetic-focused monetization model through Valorant Points. Riot PINs and Valorant gift cards add VP to your Riot account for the Valorant client and store. Cards are region-locked to Riot account regions (NA, EU, etc.). VP purchases battle passes each act and premium skin bundles. Riot Games unified wallet shares credit with League of Legends in some regions — verify before redeeming if you only play Valorant.",
    balanceCheck: { intro: "Redeem Riot/Valorant codes through the Riot account portal or Valorant client.", steps: ["Visit riotgames.com/redeem", "Log into Riot account matching card region", "Enter PIN — VP credits to Valorant wallet", "Valorant client → Store shows VP balance", "Prepaid card packaging shows denomination"] },
    whyWanted: "FPS players hunt discounted VP for skin bundles and battle passes. Esports fans fund cosmetics without linking payment cards. Holiday Riot PINs convert to cash via resale.",
    redemptionNotes: "Region must match Riot account. VP is non-transferable. Cannot buy other gift cards with VP.",
    faq: [{ q: "Valorant vs Riot PIN?", a: "Riot PINs typically fund VP usable in Valorant." }, { q: "Sell unredeemed PINs?", a: "Yes — unused codes preferred." }, { q: "NA vs EU cards?", a: "Separate Riot regions — select correctly when selling." }, { q: "League shared wallet?", a: "In some regions RP and VP share Riot Points — check account." }],
    metaKeywords: ["Valorant gift card", "sell Valorant VP", "Riot PIN redeem"],
  }),

  fortnite: p("fortnite-vbucks", "gaming", "Fortnite", {
    hook: "Fortnite V-Bucks cards unlock battle passes, outfits, emotes, and Item Shop cosmetics in Epic Games' global battle royale phenomenon.",
    about: "Fortnite by Epic Games generates billions in revenue through V-Bucks — premium currency for cosmetic items and battle passes across Battle Royale, Creative, and Save the World modes. Fortnite gift cards and V-Bucks cards redeem at epicgames.com/redeem or inside the Epic Games Launcher. Cards are region-specific with US, UK, and EU denominations common. V-Bucks bind to Epic accounts and cannot be gifted as currency after redemption. Cross-platform play makes Fortnite cards popular gifts for console and PC players alike.",
    balanceCheck: { intro: "Epic Games displays V-Bucks balance after redeeming a Fortnite card.", steps: ["Go to epicgames.com/redeem", "Sign into Epic account", "Enter code from card or email", "Fortnite Item Shop shows V-Bucks total", "Epic Games app → Wallet for balance overview"] },
    whyWanted: "Young players fund battle passes and Travis Scott-style collab skins with discounted V-Bucks. Parents use prepaid cards for spending limits. Unused holiday cards sell for USDT or Naira.",
    redemptionNotes: "Epic account region must match card. V-Bucks non-refundable. Shared across Fortnite modes on same account.",
    faq: [{ q: "V-Bucks card vs Fortnite gift card?", a: "Both typically add V-Bucks to Epic wallet — verify product label." }, { q: "Sell unused codes?", a: "Yes when rates listed." }, { q: "PlayStation store V-Bucks?", a: "Platform-specific — Epic redeem codes differ from PSN wallet." }, { q: "Partial cards?", a: "Unused full codes only." }],
    metaKeywords: ["Fortnite V-Bucks card", "sell Fortnite gift card", "V-Bucks balance"],
  }),

  discord: p("discord", "digital", "Discord", {
    hook: "Discord gift cards fund Nitro subscriptions — HD streaming, custom emojis, profile badges, and boosted servers for communities on the leading chat platform.",
    about: "Discord Inc. operates the dominant voice, video, and text communication platform for gamers, creators, and online communities. Discord Nitro gift subscriptions and Nitro trial codes enhance chat with animated avatars, larger uploads, and server boosts. Gift links redeem at discord.com/redeem or through in-app prompts. Nitro Basic and full Nitro tiers offer different perks. Discord gift cards appear at select retailers though link-based gifting is more common. Communities use Nitro boosts to unlock higher audio quality and emoji slots.",
    balanceCheck: { intro: "Discord Nitro gifts redeem via unique gift links rather than traditional balance cards.", steps: ["Open discord.com/redeem in browser", "Log into Discord account", "Paste gift link or enter code from purchase email", "Nitro activates immediately on successful redemption", "Settings → Subscriptions shows active Nitro status"] },
    whyWanted: "Streamers and mod teams fund server boosts with discounted Nitro. Gamers upgrade for screen share quality. Unused Nitro gift links convert to cash before expiration.",
    redemptionNotes: "Gift links expire if unredeemed — check email terms. Nitro is account-bound. Cannot extract after activation.",
    faq: [{ q: "Sell Discord Nitro gifts?", a: "Yes — unused gift links or codes accepted when supported." }, { q: "Nitro vs Nitro Basic?", a: "Specify tier when selling — values differ." }, { q: "Server boost included?", a: "Full Nitro includes 2 boosts — verify gift type." }, { q: "Do links expire?", a: "Yes — sell promptly after receiving." }],
    metaKeywords: ["Discord Nitro gift", "sell Discord gift card", "Discord redeem"],
  }),

  ikea: p("ikea", "retail", "IKEA", {
    hook: "IKEA gift cards fund flat-pack furniture, Swedish meatballs, and home organization solutions at the world's largest furniture retailer with hundreds of global stores.",
    about: "IKEA is a Swedish multinational selling ready-to-assemble furniture, kitchen systems, and home accessories at affordable prices with distinctive warehouse showrooms. IKEA gift cards purchase merchandise and restaurant food at IKEA stores and ikea.com in participating countries. US, UK, and EU programs are separate. IKEA Family membership perks apply alongside gift card payment. Large denominations support kitchen remodels and bedroom overhauls. Digital and physical cards available.",
    balanceCheck: { intro: "IKEA gift card balance checks vary by country through regional IKEA websites.", steps: ["Visit your country ikea.com gift card page", "Enter card number and PIN", "In-store self-checkout or cashier scans balance", "IKEA Family account may store gift card", "Customer service desk assists in-store"] },
    whyWanted: "First-apartment furnishers and renovation projects use discounted IKEA credit for big-ticket orders. Wedding registries convert surplus to cash. IKEA food court enthusiasts spend gift balance on meals.",
    redemptionNotes: "Country-specific cards only. Assembly services may accept gift cards — confirm locally. Cannot buy other gift cards.",
    faq: [{ q: "Sell US IKEA cards?", a: "Yes when USD/EUR tiers appear in calculator." }, { q: "Online and in-store?", a: "Both in supported regions." }, { q: "Do IKEA cards expire?", a: "Typically no expiration — verify regional terms." }, { q: "Restaurant purchases?", a: "Yes — IKEA restaurant accepts gift cards in most stores." }],
    metaKeywords: ["IKEA gift card balance", "sell IKEA card", "IKEA gift voucher"],
  }),

  tesco: p("tesco", "retail", "Tesco", {
    hook: "Tesco gift cards cover weekly grocery shops, Clubcard deals, and F&F clothing at the UK's largest supermarket group with thousands of locations.",
    about: "Tesco plc operates supermarkets, Express convenience stores, and Tesco.com online grocery across the United Kingdom and Ireland. Tesco gift cards purchase food, household goods, clothing, and fuel at participating stations. Clubcard points can be earned on gift card spending. GBP denominations dominate corporate gifting. Tesco Mobile and banking are separate brands — standard gift cards focus on retail. Seasonal promotions and Meal Deal culture make Tesco cards staple UK gifts.",
    balanceCheck: { intro: "Tesco gift card balance is checked online and at tills.", steps: ["Visit tesco.com/gift-cards/check-balance", "Enter 16-digit number and PIN", "Any Tesco checkout scans balance", "Clubcard app → Payment methods in supported flows", "Helpline on tesco.com gift card page"] },
    whyWanted: "UK families budget groceries with discounted Tesco cards. Clubcard Extra promotions stack with prepaid credit. Corporate GBP gifts convert internationally via resale.",
    redemptionNotes: "GBP for UK Tesco. Fuel at Tesco petrol stations where accepted. Expires per card terms — often 5 years.",
    faq: [{ q: "Sell Tesco cards for Naira?", a: "Yes — GBP Tesco tiers when rates are live." }, { q: "Tesco Ireland same card?", a: "Separate programs — verify card origin." }, { q: "Online grocery?", a: "Yes on tesco.com where gift cards accepted." }, { q: "Clubcard points?", a: "Earn on purchases after gift card applied." }],
    metaKeywords: ["Tesco gift card balance", "sell Tesco card", "Tesco gift voucher UK"],
  }),

  "southwest-airlines": p("southwest-airlines", "travel", "Southwest Airlines", {
    hook: "Southwest Airlines gift cards pay for flights across America's largest domestic carrier — with free bags and no change fees on many fares.",
    about: "Southwest Airlines Co. operates point-to-point domestic service with a unique no-assigned-seats boarding model and Bags Fly Free policy on most fares. Southwest gift cards (Southwest LUV Vouchers and gift cards) redeem on southwest.com for flights and fees. Cards do not expire. Southwest's Rapid Rewards program is separate but gift cards fund revenue tickets directly. Holiday travel and family visit planning drive Southwest card gifting across the US.",
    balanceCheck: { intro: "Southwest gift card balance is verified on the airline's website.", steps: ["Visit southwest.com → Gift cards → Check balance", "Enter card number and security code", "Apply during flight booking checkout", "Southwest app payment section", "Customer service with confirmation number"] },
    whyWanted: "Budget travelers fund Southwest sales with prepaid credit. Business travelers convert corporate travel gifts. Free bag policy makes Southwest cards attractive for family trips.",
    redemptionNotes: "US Southwest flights primarily. Multiple cards combinable on one booking. Non-refundable to cash.",
    faq: [{ q: "Sell Southwest gift cards?", a: "Yes — unused US Southwest cards when rates listed." }, { q: "LUV Vouchers same?", a: "Southwest travel funds — verify product type." }, { q: "Rapid Rewards?", a: "Gift cards fund tickets; points are separate currency." }, { q: "Expiration?", a: "Southwest gift cards do not expire." }],
    metaKeywords: ["Southwest gift card balance", "sell Southwest Airlines card", "Southwest LUV voucher"],
  }),

  "united-airlines": p("united-airlines", "travel", "United Airlines", {
    hook: "United Airlines gift cards purchase tickets on a global Star Alliance carrier serving six continents from major US hubs.",
    about: "United Airlines Holdings operates United Airlines with hubs in Chicago, Denver, Houston, Newark, San Francisco, and Washington Dulles. United gift cards redeem on united.com toward airfare, seat upgrades, and United TravelBank in supported flows. Cards make corporate incentives and family travel gifts. United MileagePlus miles are earned on paid fares funded partly by gift cards. Denominations up to $1,000 support international booking deposits.",
    balanceCheck: { intro: "United gift card balance checks use United's official portal.", steps: ["Visit united.com → Gift cards", "Enter card number and PIN", "Apply at checkout on united.com", "United app → Payment methods", "Contact United with card details for support"] },
    whyWanted: "International travelers lock fares with discounted United credit. Star Alliance connectivity adds value. Unused corporate cards convert to cash.",
    redemptionNotes: "Valid on united.com. TravelBank rules may apply. Cannot buy MilePlus miles directly with gift cards.",
    faq: [{ q: "Sell United gift cards?", a: "Yes when unused and supported." }, { q: "Partial balance?", a: "Yes with verified remaining amount." }, { q: "Partner airlines?", a: "Gift cards pay United tickets — not partner carriers directly." }, { q: "Expiration?", a: "Check card — typically no expiration on United gift cards." }],
    metaKeywords: ["United Airlines gift card", "sell United card", "United gift card balance"],
  }),

  "booking-com-gift-cards": p("booking-com-gift-cards", "travel", "Booking.com", {
    hook: "Booking.com gift cards fund hotel stays worldwide — from budget hostels to luxury resorts — on one of travel's largest accommodation platforms.",
    about: "Booking.com B.V., part of Booking Holdings, lists millions of accommodations globally including hotels, apartments, and vacation rentals. Booking.com gift cards add credit to accounts for hotel reservations on booking.com and the app. EUR and USD programs exist with regional restrictions. Credits typically apply to accommodation rates and taxes where eligible. Booking.com Genius loyalty levels provide discounts independent of gift card balance. Corporate travel and wedding guest blocks sometimes distribute Booking.com credit.",
    balanceCheck: { intro: "Booking.com wallet credit is managed in account settings after redeeming a gift code.", steps: ["Sign into booking.com", "Go to Account → Payment → Wallet or Gift card", "Enter gift code from email", "Balance shows at hotel checkout", "Booking.com help center for invalid codes"] },
    whyWanted: "Vacation planners fund summer trips with discounted Booking.com credit. Digital nomads book monthly stays. Unused travel gifts convert to USDT or Naira.",
    redemptionNotes: "Region-specific currency. Applies to eligible properties only — some exclusions apply. Non-withdrawable to bank.",
    faq: [{ q: "Sell Booking.com gift cards?", a: "Yes — EUR/USD codes when rates available." }, { q: "Flights included?", a: "Booking.com gift cards focus on accommodations." }, { q: "Genius discounts stack?", a: "Often yes on eligible bookings." }, { q: "Expiry?", a: "Check gift email terms — typically 12+ months." }],
    metaKeywords: ["Booking.com gift card", "sell Booking.com voucher", "Booking.com balance"],
  }),

  ticketmaster: p("ticketmaster", "retail", "Ticketmaster", {
    hook: "Ticketmaster gift cards unlock live concerts, sports, theater, and comedy tickets — the dominant primary ticketing platform for major events.",
    about: "Ticketmaster, a Live Nation Entertainment company, sells tickets for concerts, NFL games, Broadway shows, and festivals across North America and internationally. Ticketmaster gift cards redeem on ticketmaster.com toward event tickets and fees excluding resale marketplace purchases in most cases. Cards do not expire under standard US terms. Live event demand surges make Ticketmaster credit valuable for presales and on-sales. Digital and physical formats available from $25 to $500.",
    balanceCheck: { intro: "Ticketmaster gift card balance is checked on their gift card portal.", steps: ["Visit ticketmaster.com/giftcards", "Click Check balance", "Enter card number and PIN", "Apply at checkout when buying tickets", "Ticketmaster app wallet section"] },
    whyWanted: "Concert fans fund presales and VIP packages with prepaid credit bought below face value. Sports season ticket holders use gift cards for add-on events. Unused event gifts sell before show dates.",
    redemptionNotes: "Primary Ticketmaster sales only — not Fan-to-Fan resale in most cases. Service fees apply. Multiple cards combinable.",
    faq: [{ q: "Sell Ticketmaster cards?", a: "Yes — unused US cards when rates listed." }, { q: "Resale tickets?", a: "Gift cards typically exclude secondary market — verify terms." }, { q: "Do cards expire?", a: "Standard US Ticketmaster gift cards do not expire." }, { q: "Partial balance?", a: "Yes with verified amount." }],
    metaKeywords: ["Ticketmaster gift card balance", "sell Ticketmaster card", "Ticketmaster voucher"],
  }),

  ulta: p("ulta", "fashion", "Ulta Beauty", {
    hook: "Ulta Beauty gift cards open America's largest beauty specialty store — makeup, skincare, haircare, and salon services under one roof.",
    about: "Ulta Beauty, Inc. operates beauty superstores combining mass and prestige cosmetics with in-store salon services across the United States. Ulta gift cards purchase products from hundreds of brands and salon treatments at Ulta stores and ulta.com. Ultamate Rewards points accrue on gift card purchases. Cards never expire. Ulta's 21 Days of Beauty and holiday gift sets drive seasonal card circulation comparable to Sephora in the US market.",
    balanceCheck: { intro: "Ulta provides online and in-store gift card balance lookup.", steps: ["Visit ulta.com → Gift cards → Check balance", "Enter card number and PIN", "Ulta app → Wallet", "In-store cashier scans card", "Call 1-866-983-8582 for automated balance"] },
    whyWanted: "Beauty enthusiasts stack Ultamate Rewards with discounted gift cards during sales. Salon appointment prepayers seek prepaid balance. Holiday gifts convert to cash via resale.",
    redemptionNotes: "US Ulta stores and ulta.com. Salon services accept gift cards. Cannot buy other gift cards.",
    faq: [{ q: "Ulta vs Sephora cards?", a: "Separate retailers — verify Ulta branding." }, { q: "Sell e-gifts?", a: "Yes when unused." }, { q: "Salon eligible?", a: "Yes for in-store salon services." }, { q: "Rates?", a: "Check live calculator." }],
    metaKeywords: ["Ulta gift card balance", "sell Ulta card", "Ulta Beauty gift card"],
  }),

  "victoria-s-secret": p("victoria-s-secret", "fashion", "Victoria's Secret", {
    hook: "Victoria's Secret gift cards purchase lingerie, sleepwear, and beauty products at America's most recognized intimate apparel retailer.",
    about: "Victoria's Secret & Co. operates Victoria's Secret and PINK brands selling lingerie, loungewear, and fragrances through malls and victoriasecret.com. Gift cards redeem at stores and online for full-price and sale merchandise. VS & PINK Rewards integrate with purchases. Semi-Annual Sale events create peak gift card usage. Cards do not expire under standard US terms. Pink branding targets college-age shoppers while core VS serves broader demographics.",
    balanceCheck: { intro: "Victoria's Secret gift card balance checks online and in-store.", steps: ["Visit victoriasecret.com → Gift cards → Check balance", "Enter card and PIN", "VS app wallet", "Store associate scans at register", "Customer service line on website"] },
    whyWanted: "Semi-Annual Sale shoppers preload discounted VS credit. Valentine's and holiday gifts convert to cash. PINK college shoppers fund back-to-campus wardrobes.",
    redemptionNotes: "US Victoria's Secret and PINK stores plus online. Returns credit to gift card.",
    faq: [{ q: "PINK same card?", a: "Victoria's Secret gift cards work at PINK locations." }, { q: "Sell unused cards?", a: "Yes when rates available." }, { q: "Beauty products?", a: "Yes — VS beauty line eligible." }, { q: "Expiration?", a: "No expiration on standard cards." }],
    metaKeywords: ["Victoria's Secret gift card", "sell VS card", "Victoria's Secret balance"],
  }),

  lyft: p("lyft", "travel", "Lyft", {
    hook: "Lyft gift cards fund rides across North American cities — a flexible alternative to Uber for commuters and airport travelers.",
    about: "Lyft, Inc. operates ride-hailing services in the US and Canada with options from standard rides to XL and Lux. Lyft gift cards add credit to Lyft accounts through the app under Payment → Add gift card. Credit applies to rides and Lyft Pink membership in supported markets. Lyft competes on driver earnings and rider promotions in major metros. Corporate commute benefits sometimes distribute Lyft credit.",
    balanceCheck: { intro: "Lyft gift card balance appears in the app after redemption.", steps: ["Open Lyft app → You → Payment", "Tap Add gift card code", "Enter code from email or card", "Lyft Cash balance displays", "Lyft Help for invalid codes"] },
    whyWanted: "Daily commuters reduce transport costs with discounted Lyft credit. Airport travelers prefer prepaid rides. Corporate perks convert to cash via resale.",
    redemptionNotes: "US/Canada Lyft accounts. Auto-applies on rides. Non-withdrawable to bank.",
    faq: [{ q: "Lyft vs Uber cards?", a: "Separate platforms — not interchangeable." }, { q: "Sell Lyft codes?", a: "Yes when unused." }, { q: "Lyft Pink eligible?", a: "Gift credit may fund membership — check app." }, { q: "Partial balance?", a: "Verify in app before selling." }],
    metaKeywords: ["Lyft gift card balance", "sell Lyft card", "Lyft Cash"],
  }),

  grubhub: p("grubhub", "food", "Grubhub", {
    hook: "Grubhub gift cards cover delivery and pickup from local restaurants across thousands of US cities — an alternative to DoorDash and Uber Eats.",
    about: "Grubhub Holdings is a US food delivery platform connecting diners with restaurants for delivery and pickup orders. Grubhub gift cards redeem in the Grubhub app toward food subtotals, fees, and tips. Seamless and Grubhub share infrastructure in many markets. Cards sell online and at retailers in standard US denominations. Grubhub+ membership offers fee discounts on eligible orders. College campuses and urban markets drive Grubhub gift card gifting.",
    balanceCheck: { intro: "Grubhub gift cards redeem in the app payment section.", steps: ["Open Grubhub app → Account → Gift cards", "Tap Redeem and enter code", "Balance applies at checkout", "Grubhub.com account mirrors app wallet", "Support.grubhub.com for code issues"] },
    whyWanted: "Food delivery budgets stretch further with discounted Grubhub credit. Students order campus delivery with prepaid limits. Unused gifts sell for Naira or USDT.",
    redemptionNotes: "US Grubhub primarily. Grubhub+ benefits separate from gift balance rules.",
    faq: [{ q: "Grubhub vs DoorDash?", a: "Separate apps — cards not interchangeable." }, { q: "Sell e-codes?", a: "Yes when unused." }, { q: "Pickup orders?", a: "Gift cards work on pickup and delivery." }, { q: "Rates?", a: "Check calculator when available." }],
    metaKeywords: ["Grubhub gift card", "sell Grubhub card", "Grubhub balance"],
  }),

  "domino-s-pizza": p("domino-s-pizza", "food", "Domino's Pizza", {
    hook: "Domino's Pizza gift cards fund America's largest pizza delivery chain — pizzas, sides, and desserts ordered online or by phone.",
    about: "Domino's Pizza, Inc. operates the world's largest pizza company by store count with delivery and carryout across the US and internationally. Domino's gift cards purchase menu items through dominos.com, the app, and phone orders. Piece of the Pie Rewards points earn on gift card orders. eGift cards deliver instantly for birthdays and office parties. Domino's Tracker technology makes delivery gifting popular for game nights and family dinners.",
    balanceCheck: { intro: "Domino's gift card balance is checked online or by phone.", steps: ["Visit dominos.com → Gift cards → Check balance", "Enter card number and PIN", "Dominos app → Profile → Gift cards", "Store can scan in-person for balance", "Call store with card number"] },
    whyWanted: "Pizza night budgets benefit from discounted Domino's credit. Office party coordinators bulk-buy cards. Non-pizza fans sell gifted cards for cash.",
    redemptionNotes: "US Domino's primarily. Tips and delivery fees covered where applicable. Cannot redeem for cash.",
    faq: [{ q: "Sell Domino's e-gifts?", a: "Yes when unused." }, { q: "International Domino's?", a: "Cards region-specific — US cards for US stores." }, { q: "Rewards points?", a: "Earn on orders paid with gift cards." }, { q: "Partial balance?", a: "Yes with verified amount." }],
    metaKeywords: ["Domino's gift card balance", "sell Domino's card", "Domino's e-gift"],
  }),

  subway: p("subway", "food", "Subway", {
    hook: "Subway gift cards pay for customizable subs, salads, and wraps at the world's largest restaurant chain by location count.",
    about: "Subway IP LLC franchises submarine sandwich shops globally with made-to-order footlongs and catering platters. Subway gift cards redeem at participating US Subway locations and order.subway.com. Cards do not expire and carry no fees under standard terms. MyWay Rewards integrates with gift card checkout. Subway gift cards are common low-denomination gifts for students and office lunches.",
    balanceCheck: { intro: "Subway gift card balance checks online and in-store.", steps: ["Visit subway.com → Gift cards → Check balance", "Enter card number", "Subway app → Wallet", "Cashier scans at checkout", "Phone number on card back"] },
    whyWanted: "Daily lunch commuters save with discounted Subway cards. Catering orders for events use prepaid balance. Small-balance holiday cards aggregate via resale.",
    redemptionNotes: "Participating US Subways only — franchise participation varies. Cannot buy other gift cards.",
    faq: [{ q: "Sell Subway cards?", a: "Yes when rates listed." }, { q: "All locations?", a: "Most US franchises participate — verify locally if spending." }, { q: "eGift accepted?", a: "Yes if unused." }, { q: "Expiration?", a: "No expiration on standard Subway gift cards." }],
    metaKeywords: ["Subway gift card balance", "sell Subway card", "Subway gift card"],
  }),

  "flipkart-e-gift-voucher": p("flipkart-e-gift-voucher", "marketplace", "Flipkart", {
    hook: "Flipkart e-gift vouchers fund India's largest e-commerce marketplace — electronics, fashion, home, and groceries with nationwide delivery.",
    about: "Flipkart Pvt Ltd, owned by Walmart, dominates Indian online retail competing with Amazon India on smartphones, fashion, and Big Billion Day sales. Flipkart e-gift vouchers add balance to Flipkart accounts for purchases across categories on flipkart.com and the app. INR denominations suit Diwali, wedding, and corporate gifting culture. Flipkart Plus membership benefits apply on eligible orders. Gift vouchers are digital-first with email delivery.",
    balanceCheck: { intro: "Flipkart gift voucher balance is managed in account wallet after redemption.", steps: ["Log into flipkart.com or Flipkart app", "Go to Account → Gift Cards", "Enter voucher code to add", "Balance shows at checkout", "Flipkart support for binding issues"] },
    whyWanted: "Indian shoppers fund Big Billion Day sales with discounted vouchers. NRIs gift family in India via Flipkart credit. Corporate INR incentives convert internationally.",
    redemptionNotes: "INR for Flipkart India only. Cannot withdraw to bank. Valid on Flipkart marketplace listings.",
    faq: [{ q: "Sell Flipkart vouchers?", a: "Yes — INR Flipkart when rates are live." }, { q: "Amazon India same?", a: "No — separate platforms." }, { q: "Partial voucher?", a: "Unused full codes preferred." }, { q: "Payout currency?", a: "USDT, Naira, or Cedi at calculator rate." }],
    metaKeywords: ["Flipkart gift voucher", "sell Flipkart card", "Flipkart e-gift India"],
  }),

  ozon: p("ozon", "marketplace", "Ozon", {
    hook: "Ozon gift cards fund Russia's leading e-commerce platform — electronics, fashion, and household goods with fast regional delivery.",
    about: "Ozon Holdings operates one of Russia's largest online marketplaces with proprietary logistics and thousands of pickup points. Ozon gift certificates add account credit for marketplace purchases in RUB. The platform competes on delivery speed and seller diversity. Ozon Premium subscriptions offer shipping benefits. Gift cards suit holiday gifting in CIS markets. International resale depends on buyer access to Ozon accounts.",
    balanceCheck: { intro: "Ozon certificate balance is checked in Ozon account wallet.", steps: ["Log into ozon.ru", "Profile → Certificates and gift cards", "Enter certificate code", "Balance applies at checkout", "Ozon support for activation issues"] },
    whyWanted: "Russian shoppers fund seasonal sales with discounted Ozon credit. Diaspora gifting to relatives uses certificates. Marketplace arbitrage buyers seek below-face-value RUB credit.",
    redemptionNotes: "RUB for Ozon Russia. Region-locked platform. Non-withdrawable to cash on Ozon.",
    faq: [{ q: "Sell Ozon certificates?", a: "Yes when RUB tiers appear in calculator." }, { q: "International redemption?", a: "Requires Ozon account in supported region." }, { q: "Wildberries vs Ozon?", a: "Competing Russian marketplaces — separate cards." }, { q: "Digital only?", a: "Primarily digital certificates." }],
    metaKeywords: ["Ozon gift certificate", "sell Ozon card", "Ozon balance"],
  }),

  wildberries: p("wildberries", "marketplace", "Wildberries", {
    hook: "Wildberries gift cards shop Russia and CIS's massive fashion and general merchandise marketplace with aggressive pricing and fast delivery.",
    about: "Wildberries LLC is a major Russian online retailer specializing in apparel, shoes, cosmetics, and home goods with a vast seller marketplace. Wildberries gift certificates fund WB wallet for purchases on wildberries.ru and regional domains. The platform leads Russian e-commerce by order volume. Certificate denominations support holiday gifting across CIS countries. WB Club membership adds shipping perks on eligible orders.",
    balanceCheck: { intro: "Wildberries wallet balance shows after certificate activation in account.", steps: ["Log into wildberries.ru", "Account → Balance → Activate certificate", "Enter certificate code", "Wallet balance updates immediately", "WB support chat for invalid codes"] },
    whyWanted: "Fashion-forward CIS shoppers fund seasonal wardrobe updates. Gift certificates from employers convert via resale. Discount hunters preload before sales events.",
    redemptionNotes: "Region-specific Wildberries domains. RUB primary currency. Wallet non-withdrawable.",
    faq: [{ q: "Sell Wildberries certificates?", a: "Yes when supported in rate calculator." }, { q: "Ozon vs Wildberries?", a: "Separate marketplaces — cards not interchangeable." }, { q: "International?", a: "Account region must match certificate." }, { q: "Payout?", a: "GiftCard4Sale pays in USDT, NGN, or GHS." }],
    metaKeywords: ["Wildberries certificate", "sell Wildberries card", "WB gift card"],
  }),

  tmall: p("tmall", "marketplace", "Tmall", {
    hook: "Tmall gift cards fund premium brand shopping on Alibaba's B2C marketplace — authentic luxury and electronics from verified flagship stores in China.",
    about: "Tmall, operated by Alibaba Group, is China's leading B2C platform hosting official brand stores for Nike, Apple, and thousands of domestic labels. Tmall shopping cards ( Tao cards / Tmall vouchers) add Alipay-linked credit for Tmall purchases. CNY denominations dominate Singles Day and Double 12 shopping festivals. Tmall Global serves cross-border shoppers with international shipping. Gift cards are essential corporate gifts during Chinese New Year.",
    balanceCheck: { intro: "Tmall cards bind through Alipay or Tmall account wallet.", steps: ["Open Taobao/Tmall app", "My Taobao → Asset → Shopping card", "Enter card number and password", "Balance shows at Tmall checkout", "Alipay customer service for binding help"] },
    whyWanted: "Singles Day shoppers maximize discounts with prepaid Tmall credit. Gift cards from employers convert to cash. Authentic brand store purchases require Tmall wallet funding.",
    redemptionNotes: "CNY for Tmall China. Requires Alipay/Taobao account. Region-locked.",
    faq: [{ q: "Tmall vs Taobao?", a: "Tmall focuses on brand stores; cards may overlap with Taobao ecosystem." }, { q: "Sell Tmall cards?", a: "Yes when CNY tiers are listed." }, { q: "International?", a: "Tmall Global has separate rules — verify card type." }, { q: "JD.com vs Tmall?", a: "Separate Chinese marketplaces." }],
    metaKeywords: ["Tmall gift card", "sell Tmall voucher", "Tmall shopping card"],
  }),

  "myvanilla-prepaid-card": p("myvanilla-prepaid-card", "prepaid", "MyVanilla", {
    hook: "MyVanilla prepaid cards are widely traded open-loop Visa/Mastercard products sold at US retail — high liquidity on P2P gift card markets.",
    about: "MyVanilla prepaid debit cards, issued by partner banks, function as reloadable or single-load prepaid cards usable wherever Visa or Mastercard is accepted. MyVanilla.com account registration enables balance tracking and online purchases with billing ZIP. Sold at Walmart, CVS, and 7-Eleven. MyVanilla differs slightly from OneVanilla branding but shares similar P2P trading dynamics. Activation receipts are critical for verification on resale platforms.",
    balanceCheck: { intro: "MyVanilla balance is managed at MyVanilla.com after registration.", steps: ["Visit MyVanilla.com and register card", "Enter 16-digit number, expiry, CVV", "Dashboard shows balance and history", "Call number on card for phone inquiry", "Keep activation receipt from retailer"] },
    whyWanted: "Open-loop spending flexibility drives MyVanilla demand. Crypto traders exchange for USDT. Unbanked users prefer prepaid over traditional debit.",
    redemptionNotes: "Register before online use. Monthly fees may apply after inactivity. US merchants primarily.",
    faq: [{ q: "MyVanilla vs OneVanilla?", a: "Related prepaid programs — specify which when selling." }, { q: "Sell unregistered cards?", a: "Per trade terms — often yes with clear photos." }, { q: "Visa or Mastercard?", a: "Both exist — check card network." }, { q: "Rates?", a: "Live calculator reflects market demand." }],
    metaKeywords: ["MyVanilla balance", "sell MyVanilla card", "MyVanilla prepaid"],
  }),

  "target-visa": p("target-visa", "prepaid", "Target Visa", {
    hook: "Target Visa gift cards combine Target store branding with open-loop Visa acceptance — spend at Target or anywhere Visa debit is accepted.",
    about: "Target Visa gift cards are prepaid Visa cards sold at Target stores usable at Target and any merchant accepting Visa debit cards online and in-store. Issued by financial partners with activation at purchase. Registration with billing address required for online shopping outside Target. Target Visa differs from closed-loop Target store cards — broader acceptance but different fee structures. Popular for gifts when recipients want flexibility beyond Target aisles.",
    balanceCheck: { intro: "Target Visa balance checks use the issuer portal on the card back.", steps: ["Find balance URL on card packaging", "Enter card number, expiry, CVV", "Register card with ZIP code", "Call automated line on card back", "Target guest services may assist with store-purchased cards"] },
    whyWanted: "Dual-use flexibility — Target shopping plus general Visa spending. Discount hunters prefer open-loop Target Visa over store-only cards for versatility.",
    redemptionNotes: "Works at Target and Visa merchants. Cannot ATM cash on standard gift variant. Distinguish from red Target store cards.",
    faq: [{ q: "Target Visa vs Target store card?", a: "Visa version spends anywhere Visa accepted; store card is Target-only." }, { q: "Sell both types?", a: "Yes — specify card type when trading." }, { q: "Activation required?", a: "Yes for most cards." }, { q: "Partial balance?", a: "Yes with verified amount." }],
    metaKeywords: ["Target Visa gift card", "sell Target Visa", "Target Visa balance"],
  }),

  "walmart-visa": p("walmart-visa", "prepaid", "Walmart Visa", {
    hook: "Walmart Visa gift cards offer open-loop Visa spending power purchased at Walmart — usable beyond Walmart aisles at Visa merchants nationwide.",
    about: "Walmart Visa gift cards are prepaid Visa products sold at Walmart checkout lanes usable anywhere Visa is accepted in the US, unlike closed-loop Walmart store cards. Green Dot or other partners issue cards with standard prepaid terms. Registration enables online purchases. Walmart Visa cards trade actively on P2P markets alongside Vanilla and OneVanilla products. Activation receipt and clear card photos support verification.",
    balanceCheck: { intro: "Walmart Visa balance inquiry uses issuer website on card back.", steps: ["Read issuer URL on card (often GiftCardMall or similar)", "Enter card details online", "Register with billing ZIP", "Automated phone line on card", "Walmart receipt shows activation amount"] },
    whyWanted: "Open-loop convenience from America's most visited retailer. Crypto and P2P traders seek Walmart Visa for liquidity. General-purpose spending beats store-locked alternatives.",
    redemptionNotes: "Visa network acceptance. Not valid at Walmart as store-only card unless specified — verify product type. Monthly inactivity fees possible.",
    faq: [{ q: "Walmart Visa vs Walmart store card?", a: "Visa spends anywhere; blue store card is Walmart-only." }, { q: "Sell at GiftCard4Sale?", a: "Yes when rates listed." }, { q: "Green Dot issuer?", a: "Common issuer — follow card-back instructions." }, { q: "Unregistered OK?", a: "Follow trade verification requirements." }],
    metaKeywords: ["Walmart Visa gift card", "sell Walmart Visa", "Walmart Visa balance"],
  }),
};
