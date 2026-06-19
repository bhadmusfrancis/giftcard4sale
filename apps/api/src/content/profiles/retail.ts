import type { GiftCardProfile } from "../types";

function profile(p: GiftCardProfile): GiftCardProfile {
  return p;
}

export const RETAIL_PROFILES: Record<string, GiftCardProfile> = {
  "best-buy": profile({
    slug: "best-buy",
    category: "retail",
    brand: "Best Buy",
    hook:
      "Best Buy is America's largest consumer electronics retailer — and its gift cards are the go-to currency for TVs, laptops, gaming consoles, and smart home gear.",
    about:
      "Best Buy Co., Inc. operates over 1,000 superstores across the United States, Mexico, and Canada, specializing in consumer electronics, appliances, and tech services including Geek Squad support. Best Buy gift cards purchase everything from iPhones and PlayStation consoles to refrigerators and home theater systems at BestBuy.com and retail locations. My Best Buy loyalty members earn points on gift card purchases. Cards are sold in fixed denominations up to $500 and never expire under standard US terms. Best Buy also accepts trade-in credits separately from gift cards. The retailer runs major sales during Black Friday, back-to-school, and Super Bowl TV events when discounted gift card demand peaks.",
    balanceCheck: {
      intro: "Best Buy provides online and in-store gift card balance verification.",
      steps: [
        "Visit <strong>bestbuy.com/gift-card-balance</strong>.",
        "Enter the 16-digit card number and 4-digit PIN from the back.",
        "In store, cashiers scan the card before checkout to report balance.",
        "Best Buy mobile app → <strong>Account → Gift Cards</strong> for saved cards.",
        "Call <strong>1-888-716-6673</strong> for automated balance inquiry.",
      ],
      tip: "Best Buy gift cards cannot purchase other Best Buy gift cards — plan spending or selling accordingly.",
    },
    whyWanted:
      "Tech upgrade cycles drive Best Buy card demand — discounted credit lowers effective prices on MacBooks, OLED TVs, and gaming GPUs. Students furnishing dorm rooms and homeowners buying appliances during sales events seek below-face-value cards. Corporate rewards programs distribute Best Buy cards that non-tech recipients convert to cash.",
    redemptionNotes:
      "Redeem online with free shipping on most items or in-store for immediate pickup. Geek Squad services accept gift cards. Combine with My Best Buy member pricing for stacked savings.",
    faq: [
      { q: "Can I sell a Best Buy e-gift card?", a: "Yes. Unused digital codes with clear denomination are accepted when rates are listed." },
      { q: "Are Best Buy cards US-only?", a: "Primarily US Best Buy. Confirm card origin for accurate quoting." },
      { q: "Do Best Buy cards expire?", a: "No expiration on standard US Best Buy gift cards." },
      { q: "What denominations trade best?", a: "Enter your exact face value in our calculator — $100–$500 tiers are common." },
    ],
    metaKeywords: ["Best Buy gift card balance", "sell Best Buy card", "Best Buy to Naira"],
  }),

  "home-depot": profile({
    slug: "home-depot",
    category: "retail",
    brand: "Home Depot",
    hook:
      "Home Depot gift cards power DIY projects, contractor supplies, and home renovations at the world's largest home improvement retailer.",
    about:
      "The Home Depot, Inc. operates more than 2,300 stores across North America supplying building materials, tools, appliances, and garden products. Home Depot gift cards redeem in-store and at HomeDepot.com for lumber, paint, flooring, smart home devices, and Pro Xtra contractor program purchases. Cards do not expire and carry no fees under standard terms. Home Depot Pro accounts can apply gift cards to bulk job purchases. Denominations range from $5 to $2,000 online. Spring gardening season and hurricane prep periods create seasonal spikes in Home Depot card trading volume.",
    balanceCheck: {
      intro: "Check Home Depot gift card balance online, by phone, or in any orange-apron store.",
      steps: [
        "Visit <strong>homedepot.com/c/Gift_Cards</strong> and select Check Balance.",
        "Enter card number and PIN from the back of physical cards.",
        "In store, associates scan at any register or Pro desk.",
        "Call <strong>1-800-544-3316</strong> for automated balance lookup.",
        "Home Depot app → Wallet section after adding the gift card.",
      ],
      tip: "Contractors with partial balances on multiple cards can combine up to ten gift cards per online order.",
    },
    whyWanted:
      "Renovation projects run thousands of dollars — discounted Home Depot credit shaves material costs for homeowners and landlords. Contractors managing job budgets buy cards below face value for predictable supply spending. Housewarming gifts and wedding registry credits often convert to cash through resale.",
    redemptionNotes:
      "Works at US Home Depot stores and online. Cannot buy other gift cards. Pro Xtra members earn rewards on gift card purchases.",
    faq: [
      { q: "Does GiftCard4Sale buy Home Depot cards?", a: "Yes when marketplace rates are available. Use the calculator for today's quote." },
      { q: "Can I sell partial balance?", a: "Yes with verified remaining amount." },
      { q: "Are e-gift cards accepted?", a: "Yes — unused digital Home Depot codes qualify." },
      { q: "Do Home Depot cards work at Lowe's?", a: "No — Home Depot cards are exclusive to Home Depot." },
    ],
    metaKeywords: ["Home Depot gift card balance", "sell Home Depot card", "Home Depot exchange"],
  }),

  "lowe-s": profile({
    slug: "lowe-s",
    category: "retail",
    brand: "Lowe's",
    hook:
      "Lowe's gift cards cover everything from power tools to patio furniture at one of America's most trusted home improvement chains.",
    about:
      "Lowe's Companies, Inc. competes directly with Home Depot across roughly 1,700 North American stores offering home improvement, appliances, and seasonal goods. Lowe's gift cards fund purchases in-store and at Lowes.com including installation services through Lowe's partnerships. Military discounts and MyLowe's Rewards apply to purchases made with gift cards. Standard cards do not expire. Lowe's Pro customers apply gift cards to commercial accounts. The retailer emphasizes appliance packages and outdoor living categories where gift cards frequently appear as bundle incentives with major purchases.",
    balanceCheck: {
      intro: "Lowe's offers quick balance verification through web, phone, and in-store systems.",
      steps: [
        "Go to <strong>lowes.com/l/help/gift-card-balance</strong>.",
        "Enter gift card number and PIN.",
        "Any Lowe's cashier can check balance at the register.",
        "Call <strong>1-800-444-1408</strong> with card details.",
        "Lowe's mobile app → Gift Cards section for saved cards.",
      ],
      tip: "Lowe's and Home Depot cards are not interchangeable — verify you have a Lowe's-branded card before selling.",
    },
    whyWanted:
      "Homeowners tackling kitchen remodels and deck builds seek discounted Lowe's credit for appliances and lumber. Property managers stocking maintenance supplies buy cards at a discount for budget predictability. Holiday tool-set gifts create resale supply from recipients preferring cash.",
    redemptionNotes:
      "Redeem at US Lowe's locations and online. Installation services may accept gift cards — confirm at purchase. Combine multiple cards on large orders.",
    faq: [
      { q: "Can I sell Lowe's e-gift codes?", a: "Yes when unused and verifiable." },
      { q: "What rates does GiftCard4Sale offer?", a: "Live rates appear in the calculator — updated from marketplace data." },
      { q: "Do Lowe's cards expire?", a: "Standard Lowe's gift cards do not expire." },
      { q: "Are Canada Lowe's cards accepted?", a: "Region matters. Select the correct country tier in the calculator." },
    ],
    metaKeywords: ["Lowe's gift card balance", "sell Lowes gift card", "Lowes card Nigeria"],
  }),

  "macy-s": profile({
    slug: "macy-s",
    category: "retail",
    brand: "Macy's",
    hook:
      "Macy's gift cards unlock department-store fashion, home goods, and beauty at iconic stores and Macys.com — a staple of American retail gifting.",
    about:
      "Macy's, Inc. operates flagship department stores and the macys.com e-commerce platform selling apparel, accessories, home furnishings, and cosmetics. Macy's gift cards redeem at Macy's stores, macys.com, and Macy's Backstage outlets. Star Rewards loyalty points accrue on gift card purchases. Cards are available physically and digitally from $10 to $1,000. Macy's famous Thanksgiving Day Parade sponsorship reflects the brand's cultural footprint. Friends & Family and One-Day Sale events pair well with prepaid Macy's credit for maximum savings.",
    balanceCheck: {
      intro: "Macy's balance checks are available online, by phone, and in-store.",
      steps: [
        "Visit <strong>macys.com/account/giftcardbalance</strong>.",
        "Enter card number and CID from the back.",
        "In any Macy's store, customer service can scan your card.",
        "Call <strong>1-800-511-2752</strong> for automated balance.",
        "Macy's app → Wallet → Add gift card to view balance.",
      ],
    },
    whyWanted:
      "Fashion shoppers stack Macy's coupons with discounted gift cards during clearance events. Wedding registry credits and holiday gifts create steady resale supply. International buyers ordering US fashion seek Macy's gift cards for macys.com checkout.",
    redemptionNotes:
      "Use at Macy's and Backstage locations plus online. Cannot redeem for cash in stores. Combine with Star Rewards offers.",
    faq: [
      { q: "Does GiftCard4Sale buy Macy's cards?", a: "Yes — $100–$300 tiers commonly appear in our rate table." },
      { q: "Are e-gift cards OK?", a: "Yes if unused with verifiable code." },
      { q: "Can I sell partial balance?", a: "Yes — enter exact remaining amount after balance check." },
      { q: "Do Macy's cards expire?", a: "No expiration on standard Macy's gift cards." },
    ],
    metaKeywords: ["Macy's gift card balance", "sell Macy's card", "Macy's to Naira"],
  }),

  cvs: profile({
    slug: "cvs",
    category: "retail",
    brand: "CVS",
    hook:
      "CVS Pharmacy gift cards spend on health essentials, beauty products, and everyday convenience items at over 9,000 US locations.",
    about:
      "CVS Health Corporation operates CVS Pharmacy, one of America's largest drugstore chains, plus MinuteClinic health services and CVS.com e-commerce. CVS gift cards purchase OTC medications, skincare, snacks, photo services, and household basics. ExtraCare loyalty integrates with gift card checkout. Cards sell at CVS stores, grocery partners, and online gift malls in standard US denominations. CVS and Walgreens cards are distinct — verify branding. Healthcare-focused gifting and wellness program rewards frequently distribute CVS credit.",
    balanceCheck: {
      intro: "CVS gift card balances can be checked online or at any pharmacy counter.",
      steps: [
        "Visit <strong>cvs.com/content/gift-cards</strong> and use Check Balance.",
        "Enter the 16-digit card number.",
        "Any CVS cashier can scan the card at checkout.",
        "Call the number on the back of the card for phone inquiry.",
        "CVS app → Deals & Rewards → Gift Cards after linking.",
      ],
    },
    whyWanted:
      "Families budgeting pharmacy and household expenses buy discounted CVS cards for predictable spending. ExtraCare coupon stacking amplifies savings when combined with below-face-value credit. Corporate wellness incentives often convert to cash via resale.",
    redemptionNotes:
      "Valid at US CVS locations and cvs.com. Cannot buy prescriptions in all states with gift cards — check local policy. No cash redemption at registers.",
    faq: [
      { q: "Is CVS the same as CVS/Dollar General combo cards?", a: "CVS Pharmacy cards are separate from Dollar General. Verify your card issuer." },
      { q: "What denominations are supported?", a: "$100–$500 CVS tiers are common — use the calculator for your amount." },
      { q: "Are digital CVS codes accepted?", a: "Yes when unused and verifiable." },
      { q: "Do CVS cards expire?", a: "Standard terms: no expiration and no dormancy fees." },
    ],
    metaKeywords: ["CVS gift card balance", "sell CVS card", "CVS pharmacy gift card"],
  }),

  "dollar-general": profile({
    slug: "dollar-general",
    category: "retail",
    brand: "Dollar General",
    hook:
      "Dollar General gift cards stretch household budgets across thousands of neighborhood stores selling groceries, cleaning supplies, and seasonal goods at value prices.",
    about:
      "Dollar General Corporation operates over 19,000 small-format stores primarily in rural and suburban America, emphasizing affordable everyday products. Dollar General gift cards redeem in-store for merchandise excluding alcohol, tobacco, and other restricted categories per store policy. DG AutoDeliver and digital coupons work alongside gift card payment. Cards are sold at Dollar General locations and third-party retailers in fixed denominations. The chain's expansion into fresh produce and health products increases card utility beyond traditional dollar-store categories.",
    balanceCheck: {
      intro: "Dollar General gift card balance inquiry is handled in-store and via the issuer portal on the card packaging.",
      steps: [
        "Check the issuer website printed on your card back (often a third-party gift card processor).",
        "Enter card number and PIN on the issuer portal.",
        "At Dollar General, cashiers can scan the card before checkout.",
        "Call the customer service number on the card reverse side.",
        "Keep purchase receipt showing activation for dispute support.",
      ],
      tip: "Note whether your card is a standard Dollar General closed-loop card versus a network prepaid card — rates may differ.",
    },
    whyWanted:
      "Budget-conscious shoppers in rural communities rely on Dollar General for affordable essentials — discounted cards lower effective prices further. SNAP-eligible items and DG digital coupons stack with gift card credit. Employer incentive programs in small towns often distribute DG cards converted to cash through resale.",
    redemptionNotes:
      "In-store redemption at US Dollar General locations. Online DG shopping acceptance varies — confirm current policy. Cannot cash out at register.",
    faq: [
      { q: "Does GiftCard4Sale buy Dollar General cards?", a: "Yes when rates are listed — common tiers include $100–$500." },
      { q: "Can I sell unused DG e-codes?", a: "Yes with verifiable unused status." },
      { q: "Are Dollar General and CVS cards the same?", a: "No — they are separate retailers with distinct gift card programs." },
      { q: "Do DG cards expire?", a: "Check card packaging — standard closed-loop cards typically have no expiration." },
    ],
    metaKeywords: ["Dollar General gift card balance", "sell Dollar General card", "DG gift card"],
  }),

  adidas: profile({
    slug: "adidas",
    category: "fashion",
    brand: "Adidas",
    hook:
      "Adidas gift cards fuel athletic style — from Ultraboost running shoes to Originals streetwear — at adidas.com and brand stores worldwide.",
    about:
      "Adidas AG is a German multinational sportswear giant and longtime rival to Nike, sponsoring major football clubs, Olympians, and cultural icons. Adidas gift cards purchase footwear, apparel, and accessories at Adidas retail stores and adidas.com. Confirmed app drops and Yeezy-era hype (where applicable by region) drove secondary market interest in Adidas credit. Cards are region-specific with separate US, EU, and UK programs. Adidas Creators Club points apply to purchases funded by gift cards. Physical and digital cards range across standard sportswear denominations.",
    balanceCheck: {
      intro: "Adidas provides online balance lookup for gift cards in supported regions.",
      steps: [
        "Visit <strong>adidas.com/us/giftcards</strong> (adjust region as needed).",
        "Select Check Gift Card Balance.",
        "Enter card number and PIN.",
        "Adidas retail stores can verify balance at checkout.",
        "Digital gift emails include redemption codes and denomination details.",
      ],
    },
    whyWanted:
      "Football fans buying club kits, runners upgrading trainers, and streetwear collectors seek discounted Adidas credit for seasonal collections. Gift cards from sports league promotions convert to cash via resale. Three-stripe loyalists preload cards during outlet sale periods.",
    redemptionNotes:
      "Redeem at Adidas stores and online for the matching region. Cannot buy other gift cards. Sale items accept gift card payment.",
    faq: [
      { q: "Can I sell EU Adidas cards?", a: "Select the correct region in our calculator when EUR tiers are available." },
      { q: "Are Adidas e-codes accepted?", a: "Yes — unused digital codes qualify." },
      { q: "Do Adidas cards expire?", a: "Typically no expiration — verify regional terms on packaging." },
      { q: "Adidas vs Nike cards — same rates?", a: "Rates differ by brand demand. Use the live calculator for Adidas-specific quotes." },
    ],
    metaKeywords: ["Adidas gift card balance", "sell Adidas card", "Adidas gift card Nigeria"],
  }),

  "h-m": profile({
    slug: "h-m",
    category: "fashion",
    brand: "H&M",
    hook:
      "H&M gift cards deliver fast-fashion trends, kids' clothing, and home decor at affordable prices across 75+ global markets.",
    about:
      "H & M Hennes & Mauritz AB is a Swedish multinational clothing retailer known for affordable fashion, sustainability initiatives, and designer collaborations. H&M gift cards work in participating H&M stores and at hm.com for the issuing country. The brand rotates collections rapidly, making gift cards popular for teen gifting and back-to-school wardrobes. H&M Member offers apply when paying with gift cards. Denominations vary by market with US, UK, and EU programs commonly traded. Digital and physical cards are widely available.",
    balanceCheck: {
      intro: "H&M gift card balance checks differ slightly by country but follow a common online pattern.",
      steps: [
        "Visit your regional H&M site gift card page (e.g., <strong>hm.com/us/gift-card</strong>).",
        "Click Check balance and enter card number and PIN.",
        "In-store, cashiers scan cards before payment.",
        "H&M app → My Account → Gift card section in supported regions.",
        "Retain purchase receipt for cards that fail online lookup.",
      ],
    },
    whyWanted:
      "Budget fashion shoppers stretch seasonal wardrobes with discounted H&M credit. Parents buying growing kids' clothing prefer prepaid limits via gift cards bought below face value. Collaboration drops (designer lines) create spending surges funded by secondary-market cards.",
    redemptionNotes:
      "Country-specific — US cards work at US H&M only. Returns process back to gift card in most markets. Member discounts stack at checkout.",
    faq: [
      { q: "Can I sell UK H&M cards?", a: "Yes when GBP tiers appear in our rate calculator." },
      { q: "Are H&M digital gift cards OK?", a: "Yes if unused with verifiable code." },
      { q: "Do H&M cards expire?", a: "Most regions: no expiration on standard gift cards." },
      { q: "H&M Home purchases covered?", a: "Yes — H&M gift cards fund apparel and H&M Home items." },
    ],
    metaKeywords: ["H&M gift card balance", "sell H&M card", "H&M gift card exchange"],
  }),

  lululemon: profile({
    slug: "lululemon",
    category: "fashion",
    brand: "Lululemon",
    hook:
      "Lululemon gift cards unlock premium athleisure — yoga leggings, running gear, and lifestyle apparel — at one of fashion's hottest activewear brands.",
    about:
      "Lululemon Athletica Inc. built a cult following around premium yoga and athletic apparel with stores across North America, Europe, Asia, and Australia. Lululemon gift cards purchase clothing, accessories, and studio gear at stores and lululemon.com. We Made Too Much clearance section accepts gift card payment for deep discounts. Cards do not expire in the US. The brand's community events and mirror home gym products expand spending categories beyond traditional apparel.",
    balanceCheck: {
      intro: "Lululemon offers online and in-store gift card balance verification.",
      steps: [
        "Visit <strong>shop.lululemon.com/gift-cards</strong> → Check Balance.",
        "Enter card number and PIN.",
        "Store educators scan cards at any retail location.",
        "Lululemon app wallet section after adding the card.",
        "Customer service can assist with balance disputes with proof of purchase.",
      ],
    },
    whyWanted:
      "Wellness enthusiasts funding yoga wardrobes seek discounted Lululemon credit for premium leggings and jackets. Holiday gifts from non-fitness friends often convert to cash. We Made Too Much hunters preload cards before restocks.",
    redemptionNotes:
      "US and Canada cards are region-specific. Online and in-store redemption. Returns credit back to gift card.",
    faq: [
      { q: "Does GiftCard4Sale buy Lululemon e-gifts?", a: "Yes — unused codes accepted when rates are listed." },
      { q: "Can I sell partial balance?", a: "Yes with verified remaining amount." },
      { q: "Do Lululemon cards expire?", a: "US cards: no expiration or fees." },
      { q: "Mirror fitness equipment eligible?", a: "Gift cards may apply to select products — verify at checkout if spending." },
    ],
    metaKeywords: ["Lululemon gift card balance", "sell Lululemon card", "Lululemon exchange"],
  }),

  asos: profile({
    slug: "asos",
    category: "fashion",
    brand: "ASOS",
    hook:
      "ASOS gift cards open access to thousands of fashion brands on one of Europe's largest online style destinations — perfect for trend-driven shoppers.",
    about:
      "ASOS plc is a British online fashion retailer stocking over 850 brands plus its own labels, shipping to 200+ countries. ASOS gift cards redeem at asos.com for clothing, shoes, accessories, and beauty. The platform targets millennials and Gen Z with inclusive sizing and frequent sales. Cards are GBP-denominated for the UK market with separate regional programs. ASOS Premier delivery subscriptions can be funded alongside product purchases. Digital instant delivery dominates ASOS gifting.",
    balanceCheck: {
      intro: "ASOS gift card balances are checked directly on the ASOS website.",
      steps: [
        "Log into <strong>asos.com</strong> and go to My Account → Gift Vouchers.",
        "Enter voucher code to apply and view balance.",
        "Unused codes show denomination on the purchase email.",
        "ASOS customer care assists with lost codes when proof of purchase exists.",
        "Gift vouchers apply automatically at checkout when linked to your account.",
      ],
    },
    whyWanted:
      "UK and EU fashion lovers stack ASOS sale events with discounted gift vouchers. International students shopping British fashion seek GBP ASOS credit. Birthday vouchers from friends convert to Naira or USDT through resale.",
    redemptionNotes:
      "GBP vouchers for asos.com UK. Cannot withdraw as cash on ASOS. Sale items eligible.",
    faq: [
      { q: "Can I sell ASOS gift vouchers?", a: "Yes — GBP ASOS codes are commonly traded when rates are live." },
      { q: "Are ASOS cards region-locked?", a: "Yes — UK ASOS vouchers work on asos.com with matching currency." },
      { q: "Do ASOS vouchers expire?", a: "Typically 2 years from purchase — check terms and sell promptly." },
      { q: "Physical ASOS cards accepted?", a: "Yes if unused with verifiable balance." },
    ],
    metaKeywords: ["ASOS gift card balance", "sell ASOS voucher", "ASOS gift card UK"],
  }),

  "m-s": profile({
    slug: "m-s",
    category: "retail",
    brand: "Marks & Spencer",
    hook:
      "M&S gift cards combine quality fashion, home products, and famous food halls — a British high-street institution since 1884.",
    about:
      "Marks and Spencer Group plc is a major British multinational retailer known for quality clothing, home furnishings, and prepared food. M&S gift cards spend at Marks & Spencer stores and marksandspencer.com on fashion, beauty, flowers, and food hall products. Sparks loyalty offers integrate with gift card checkout. Cards are GBP-focused with e-gift and physical formats. M&S Christmas food orders and Percy Pig merchandise drive seasonal gifting spikes across the UK.",
    balanceCheck: {
      intro: "M&S provides online and in-store gift card balance checks for UK cards.",
      steps: [
        "Visit <strong>marksandspencer.com/c/gift-cards/check-your-balance</strong>.",
        "Enter 19-digit card number and PIN.",
        "Any M&S store till can scan balance.",
        "Sparks app → Gift cards after linking.",
        "Customer services line on M&S website for phone support.",
      ],
    },
    whyWanted:
      "UK shoppers fund Christmas food orders and wardrobe refreshes with discounted M&S credit. Sparks members maximize sale periods with prepaid balance. Gift cards from employers convert to cash via international resale platforms.",
    redemptionNotes:
      "GBP cards for UK M&S. Food hall, fashion, and home categories eligible. Cannot buy lottery or other gift cards.",
    faq: [
      { q: "Can Nigerians sell UK M&S cards?", a: "Yes — GiftCard4Sale pays in Naira, Cedi, or USDT for supported GBP tiers." },
      { q: "Do M&S e-gifts qualify?", a: "Yes when unused." },
      { q: "Do M&S cards expire?", a: "UK M&S gift cards: no expiry under current terms." },
      { q: "Food hall only cards?", a: "Standard M&S gift cards cover food and general merchandise." },
    ],
    metaKeywords: ["M&S gift card balance", "sell Marks and Spencer card", "M&S voucher"],
  }),

  "costco-cash-card": profile({
    slug: "costco-cash-card",
    category: "retail",
    brand: "Costco",
    hook:
      "Costco Cash Cards unlock warehouse savings on bulk groceries, electronics, and membership-only deals at the world's largest membership club.",
    about:
      "Costco Wholesale Corporation operates membership warehouse clubs globally known for bulk value, Kirkland Signature private label, and rotating treasure-aisle finds. Costco Cash Cards (gift cards) pay for merchandise at Costco warehouses and Costco.com — membership is still required for shopping. Cash Cards do not expire and have no fees. Denominations up to $1,000 make them popular corporate gifts. Costco's gasoline stations and food courts accept Cash Cards in the US. Non-members cannot shop even with a Cash Card unless accompanied by a member in some policies — verify local rules.",
    balanceCheck: {
      intro: "Costco Cash Card balances are verified in warehouse and online.",
      steps: [
        "Visit <strong>costco.com</strong> → Customer Service → Cash Card Balance.",
        "Enter membership number (if required), card number, and PIN.",
        "At warehouse checkout, cashiers report remaining balance on receipt.",
        "Costco member services desk can scan cards.",
        "Keep the card — Costco Cash Cards are reusable until depleted.",
      ],
    },
    whyWanted:
      "Bulk buyers and families stretch warehouse budgets with discounted Costco Cash Cards. Small business breakroom stocking and event catering use prepaid Costco credit. Corporate holiday gifts convert to cash for non-members.",
    redemptionNotes:
      "Requires active Costco membership for purchases. Works on merchandise, food court, and gas (US). Not valid for membership fee payment.",
    faq: [
      { q: "Can I sell Costco Cash Cards without a membership?", a: "Yes — sellers do not need membership. Buyers spending in-store do." },
      { q: "Are Costco shop cards the same?", a: "Costco Cash Cards and shop cards function similarly — verify branding." },
      { q: "Do Costco cards expire?", a: "No expiration or fees on Cash Cards." },
      { q: "What denominations trade?", a: "Enter exact face value — $100–$500+ tiers are common." },
    ],
    metaKeywords: ["Costco Cash Card balance", "sell Costco gift card", "Costco card exchange"],
  }),

  aldi: profile({
    slug: "aldi",
    category: "retail",
    brand: "Aldi",
    hook:
      "Aldi gift cards help shoppers save on discount groceries, Aldi Finds specials, and weekly produce at one of the fastest-growing supermarket chains.",
    about:
      "Aldi is a global discount supermarket chain operating thousands of stores across the US, UK, EU, and Australia with a focus on private-label quality at low prices. Aldi gift cards (where offered by region) purchase groceries, household items, and rotating Aldi Finds merchandise in-store. Availability varies — US Aldi gift cards are sold in fixed denominations at stores and through third-party gift malls. The twice-weekly Aldi Finds aisle drives treasure-hunt shopping culture. Gift cards cannot typically be used for online delivery where Aldi lacks e-commerce.",
    balanceCheck: {
      intro: "Aldi gift card balance checks use the issuer portal printed on the card.",
      steps: [
        "Find the balance inquiry URL or phone number on the card back.",
        "Enter card number and PIN on the issuer website.",
        "At Aldi checkout, cashiers can scan remaining balance.",
        "Retain activation receipt from purchase.",
        "Contact Aldi customer service in your country for regional card support.",
      ],
    },
    whyWanted:
      "Grocery budgeters stretch weekly food spending with discounted Aldi cards. Meal preppers and large families buying Aldi Finds specials seek below-face-value credit. Regional employer rewards convert to cash through resale.",
    redemptionNotes:
      "In-store use at participating Aldi locations in the issuing country. Alcohol acceptance varies by US state law.",
    faq: [
      { q: "Are Aldi cards available in all countries?", a: "Gift card programs vary — US and UK are most common in trade." },
      { q: "Can I sell Aldi e-codes?", a: "Yes when unused and supported in our calculator." },
      { q: "Do Aldi cards work online?", a: "Generally in-store only — Aldi has limited online shopping by region." },
      { q: "Rates on GiftCard4Sale?", a: "Check the live calculator for current Aldi card quotes." },
    ],
    metaKeywords: ["Aldi gift card balance", "sell Aldi card", "Aldi gift voucher"],
  }),

  coles: profile({
    slug: "coles",
    category: "retail",
    brand: "Coles",
    hook:
      "Coles gift cards fund weekly grocery shops, deli purchases, and Flybuys rewards at one of Australia's largest supermarket chains.",
    about:
      "Coles Group operates hundreds of supermarkets across Australia alongside Coles Express fuel stations and online delivery through Coles Online. Coles gift cards purchase groceries, alcohol (where permitted), and general merchandise in-store and online. Flybuys points can be earned on gift card transactions. AUD-denominated cards are popular corporate gifts in Australia. Coles & Co brand portfolio includes liquor and financial services with separate gift card rules — verify Coles supermarket branding.",
    balanceCheck: {
      intro: "Coles gift card balances are checked online and in-store across Australia.",
      steps: [
        "Visit <strong>coles.com.au/gift-cards</strong> → Check balance.",
        "Enter card number and PIN.",
        "Any Coles supermarket checkout can scan balance.",
        "Coles Online account → Payment methods after adding card.",
        "Call Coles gift card support line listed on coles.com.au.",
      ],
    },
    whyWanted:
      "Australian families budget grocery spending with discounted Coles cards. Flybuys collectors maximize promotional periods using prepaid credit. Corporate AUD gifts convert to Naira or USDT internationally via resale.",
    redemptionNotes:
      "AUD cards for Coles Australia. Valid at Coles supermarkets and Coles Online. Some Coles Express locations accept cards — confirm locally.",
    faq: [
      { q: "Can I sell Coles cards from Nigeria?", a: "Yes — GiftCard4Sale supports AUD Coles tiers when rates are live." },
      { q: "Do Coles cards expire?", a: "Australian Coles gift cards: 36 months validity — check your card." },
      { q: "Are e-gift cards accepted?", a: "Yes if unused with verifiable AUD denomination." },
      { q: "Coles vs Woolworths cards?", a: "Separate programs — confirm Coles branding before selling." },
    ],
    metaKeywords: ["Coles gift card balance", "sell Coles card", "Coles gift card AUD"],
  }),

  myer: profile({
    slug: "myer",
    category: "retail",
    brand: "Myer",
    hook:
      "Myer gift cards deliver Australian department-store shopping — fashion, beauty, homewares, and Christmas windows — at iconic retail destinations.",
    about:
      "Myer Holdings Ltd. is one of Australia's largest department store groups operating Myer stores nationwide and myer.com.au. Myer gift cards purchase apparel, cosmetics, home goods, and toys across hundreds of brands. Myer One loyalty integrates with gift card spending. AUD cards come in physical and digital formats popular for corporate gifting and wedding registries. Myer's seasonal sales and Christmas gift hub drive peak card circulation.",
    balanceCheck: {
      intro: "Myer provides online balance lookup for Australian gift cards.",
      steps: [
        "Go to <strong>myer.com.au/gift-cards/check-balance</strong>.",
        "Enter card number and PIN.",
        "In-store, any register scans Myer gift cards.",
        "Myer app → Wallet after adding voucher.",
        "Customer service for phone balance assistance.",
      ],
    },
    whyWanted:
      "Australian shoppers fund Myer One tier benefits and seasonal sales with discounted cards. Registry surplus converts to cash. Beauty and designer concessions attract gift card spending.",
    redemptionNotes:
      "AUD for Myer Australia stores and online. Exclusions may apply to some concessions — check at purchase.",
    faq: [
      { q: "Sell Myer cards for Naira?", a: "Yes — select AUD tier in calculator for payout in NGN, GHS, or USDT." },
      { q: "Partial balance OK?", a: "Yes with verified amount." },
      { q: "Do Myer cards expire?", a: "36 months from issue date under standard terms." },
      { q: "Digital Myer gifts accepted?", a: "Yes when unused." },
    ],
    metaKeywords: ["Myer gift card balance", "sell Myer card", "Myer gift card Australia"],
  }),

  "david-jones": profile({
    slug: "david-jones",
    category: "retail",
    brand: "David Jones",
    hook:
      "David Jones gift cards unlock premium Australian retail — luxury fashion, beauty halls, and homewares at the country's most prestigious department store.",
    about:
      "David Jones Pty Ltd is an iconic Australian premium department store chain offering designer fashion, beauty, homewares, and food halls since 1838. David Jones gift cards redeem at DJ stores and davidjones.com for full-price and sale merchandise. Rewards+ loyalty points accrue on gift card purchases. AUD denominations suit corporate premium gifting. David Jones seasonal campaigns and beauty events create strong gift card demand among Australian shoppers.",
    balanceCheck: {
      intro: "David Jones gift card balance checks are available online and in-store.",
      steps: [
        "Visit <strong>davidjones.com/gift-cards</strong> → Check balance.",
        "Enter card number and access PIN.",
        "DJ store registers scan gift cards.",
        "David Jones app wallet section.",
        "Contact David Jones customer relations for support.",
      ],
    },
    whyWanted:
      "Luxury shoppers time DJ sales with discounted gift cards for designer bargains. Wedding and milestone gifts convert to cash via resale. Beauty hall enthusiasts fund premium skincare with below-face-value credit.",
    redemptionNotes:
      "AUD cards for David Jones Australia. Online and in-store. Some third-party concessions may exclude gift cards.",
    faq: [
      { q: "Can I sell David Jones e-gifts?", a: "Yes — unused AUD codes accepted when rates are listed." },
      { q: "David Jones vs Myer cards?", a: "Separate retailers — verify card branding." },
      { q: "Expiry?", a: "Typically 36 months — confirm on card." },
      { q: "International payout?", a: "GiftCard4Sale pays in USDT, Naira, or Cedi for supported tiers." },
    ],
    metaKeywords: ["David Jones gift card balance", "sell David Jones card", "DJ gift card"],
  }),

  argoss: profile({
    slug: "argoss",
    category: "retail",
    brand: "Argos",
    hook:
      "Argos gift cards cover electronics, home essentials, and toys through the UK's unique catalog-order retailer with fast collection and delivery.",
    about:
      "Argos Limited is a British catalog retailer operating physical collection points inside Sainsbury's supermarkets and standalone locations, selling electronics, furniture, toys, and appliances. Argos gift cards purchase any catalog item online at argos.co.uk or in-store via collection codes. GBP cards integrate with Argos credit and Klarna where eligible. The retailer is owned by J Sainsbury plc, making Argos cards popular UK gifts for birthdays and Christmas.",
    balanceCheck: {
      intro: "Argos gift card balances are checked on the Argos website.",
      steps: [
        "Visit <strong>argos.co.uk</strong> → Gift cards → Check balance.",
        "Enter 16-digit card number and PIN.",
        "In Sainsbury's/Argos stores, staff scan at payment.",
        "Argos app checkout shows applied gift card balance.",
        "Helpline on argos.co.uk for phone inquiries.",
      ],
    },
    whyWanted:
      "UK parents buying toys and tablets seek discounted Argos credit. Home office setup and appliance upgrades use prepaid balance. Nectar-linked Sainsbury's ecosystem shoppers convert unwanted Argos gifts to cash.",
    redemptionNotes:
      "GBP for UK Argos. Catalog number ordering online or in-store collection. Cannot buy other gift cards.",
    faq: [
      { q: "Sell Argos cards internationally?", a: "Yes — GBP Argos tiers pay out in your chosen currency on GiftCard4Sale." },
      { q: "E-gift accepted?", a: "Yes if unused." },
      { q: "Expiry?", a: "Check card — typically long validity under UK rules." },
      { q: "Works at Sainsbury's?", a: "Argos cards are for Argos purchases — not general Sainsbury's groceries." },
    ],
    metaKeywords: ["Argos gift card balance", "sell Argos card", "Argos gift voucher UK"],
  }),

  arcteryx: profile({
    slug: "arcteryx",
    category: "fashion",
    brand: "Arc'teryx",
    hook:
      "Arc'teryx gift cards fund premium outdoor performance gear — Gore-Tex shells, climbing harnesses, and technical layers built for serious adventurers.",
    about:
      "Arc'teryx Equipment is a Canadian high-end outdoor apparel and equipment company renowned for technical climbing, skiing, and hiking gear with premium pricing. Arc'teryx gift cards purchase apparel and equipment at Arc'teryx stores and arcteryx.com. The brand's ReBird resale program reflects sustainability focus separate from gift cards. Cards are primarily USD and CAD with regional stores globally. Outdoor enthusiasts treat Arc'teryx as an investment brand — gift cards help manage high ticket prices.",
    balanceCheck: {
      intro: "Arc'teryx gift card balance is checked through their official gift card portal.",
      steps: [
        "Visit <strong>arcteryx.com</strong> → Customer Support → Gift Cards.",
        "Use Check Balance with card number and PIN.",
        "Brand stores scan cards at checkout.",
        "Digital gift emails show denomination.",
        "Contact Arc'teryx customer service for disputes.",
      ],
    },
    whyWanted:
      "Climbers and backcountry skiers invest heavily in Arc'teryx shells — discounted cards reduce gear costs. Gift recipients outside the outdoor community convert cards to cash. Seasonal layering purchases spike before winter.",
    redemptionNotes:
      "Redeem at Arc'teryx stores and online for matching region. Sale and outlet exclusions may apply — check terms.",
    faq: [
      { q: "Does GiftCard4Sale buy Arc'teryx cards?", a: "Yes when USD/CAD tiers appear in the calculator." },
      { q: "Outlet purchases?", a: "Verify current Arc'teryx outlet gift card policy if spending." },
      { q: "Partial balance?", a: "Sellable with verified remaining amount." },
      { q: "E-codes OK?", a: "Yes when unused." },
    ],
    metaKeywords: ["Arc'teryx gift card balance", "sell Arc'teryx card", "Arc'teryx gift card"],
  }),

  "footlocker-sports": profile({
    slug: "footlocker-sports",
    category: "fashion",
    brand: "Foot Locker",
    hook:
      "Foot Locker gift cards are sneaker culture currency — Jordan retros, Nike dunks, and athletic apparel at the world's leading athletic footwear specialty chain.",
    about:
      "Foot Locker, Inc. operates Foot Locker, Kids Foot Locker, Champs Sports, and Eastbay banners across malls worldwide as a premier basketball and sneaker destination. Foot Locker gift cards purchase footwear, apparel, and accessories in-store and at footlocker.com. Launch reservations and FLX membership rewards interact with gift card checkout. US cards dominate secondary trading tied to US sneaker releases. Parent company portfolio means some cards work across banners — verify card terms.",
    balanceCheck: {
      intro: "Foot Locker provides online gift card balance lookup for US cards.",
      steps: [
        "Visit <strong>footlocker.com/giftcards/checkbalance.html</strong>.",
        "Enter gift card number and PIN.",
        "Store associates scan at any Foot Locker or Champs location.",
        "FLX app wallet after linking.",
        "Call number on card back for automated balance.",
      ],
    },
    whyWanted:
      "Sneaker release calendars drive Foot Locker card demand for confirmed pairs at retail. Basketball fans buying team gear seek discounted credit. Holiday mall gift cards convert to cash via resale.",
    redemptionNotes:
      "US cards for US Foot Locker ecosystem. SNKRS-adjacent releases may sell through Foot Locker reservation apps. Combine FLX points with gift cards.",
    faq: [
      { q: "Foot Locker vs Nike cards?", a: "Separate programs — Foot Locker sells Nike product but cards differ." },
      { q: "Champs Sports same card?", a: "Many Foot Locker-issued cards work across banners — check terms." },
      { q: "Sell e-gift?", a: "Yes when unused." },
      { q: "Rates?", a: "Use live calculator — $100–$500 common." },
    ],
    metaKeywords: ["Foot Locker gift card balance", "sell Foot Locker card", "Foot Locker to Naira"],
  }),
};
