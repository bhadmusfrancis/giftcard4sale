import type { GiftCardProfile } from "../types";

function profile(p: GiftCardProfile): GiftCardProfile {
  return p;
}

export const PREPAID_PROFILES: Record<string, GiftCardProfile> = {
  mastercard: profile({
    slug: "mastercard",
    category: "prepaid",
    brand: "Mastercard",
    hook:
      "Mastercard prepaid gift cards spend anywhere Mastercard is accepted — offering open-loop flexibility unmatched by single-store retail cards.",
    about:
      "Mastercard Inc. licenses its payment network to banks and program managers issuing prepaid gift cards usable at millions of merchants worldwide. Unlike closed-loop store cards, Mastercard gift cards function like temporary debit cards for online and in-store purchases where prepaid cards are accepted. US issuers include major banks packaging cards for supermarkets and pharmacies. Activation, registration with billing ZIP, and issuer-specific fee schedules apply. Mastercard gift cards cannot typically withdraw ATM cash unless issued as prepaid debit with PIN.",
    balanceCheck: {
      intro: "Mastercard gift card balance inquiry goes through the issuing bank's portal on the card back — not mastercard.com.",
      steps: [
        "Locate issuer website on card packaging (e.g., <strong>MyBalanceNow.com</strong>, bank-specific portals).",
        "Enter 16-digit card number, expiration, and CVV.",
        "Register the card with your name and ZIP for online shopping if required.",
        "Call toll-free number on card back for automated balance.",
        "Some issuers offer mobile apps for balance tracking.",
      ],
      tip: "Identify the issuing program — GiftCard4Sale rates may differ for different Mastercard prepaid products.",
    },
    whyWanted:
      "Open-loop acceptance makes Mastercard gift cards ideal for online purchases at any accepting merchant. Travelers and privacy-conscious shoppers prefer prepaid cards over personal cards. Discount hunters effectively reduce all-purpose spending costs.",
    redemptionNotes:
      "Register before first online use. Monthly inactivity fees may apply after 12 months on some programs. Partial balances remain until depleted or fees consume them.",
    faq: [
      { q: "Mastercard vs Visa gift cards?", a: "Both are open-loop prepaid — rates differ by program and demand." },
      { q: "Activation required?", a: "Yes for most cards. Provide activation proof if requested." },
      { q: "Sell partial balance?", a: "Yes with verified remaining amount." },
      { q: "International use?", a: "US cards typically US merchants — check issuer cross-border terms." },
    ],
    metaKeywords: ["Mastercard gift card balance", "sell Mastercard prepaid", "Mastercard to USDT"],
  }),

  "onevanilla-visa-mastercard": profile({
    slug: "onevanilla-visa-mastercard",
    category: "prepaid",
    brand: "OneVanilla",
    hook:
      "OneVanilla Visa and Mastercard prepaid cards are among the most traded open-loop gift cards — simple activation, broad acceptance, and high P2P liquidity.",
    about:
      "OneVanilla is a popular prepaid gift card program issued by The Bancorp Bank and other partners, sold at CVS, Walgreens, Dollar General, and convenience stores across the United States. Cards come in Visa and Mastercard network variants with fixed denominations from $20 to $500. OneVanilla cards require online registration at OneVanilla.com for balance management and online purchases. The brand is distinct from Vanilla Visa direct issuances but shares similar market dynamics. Fraud prevention measures make accurate card photos and activation receipts important for resale verification.",
    balanceCheck: {
      intro: "OneVanilla balance checks happen at the official OneVanilla portal after card registration.",
      steps: [
        "Visit <strong>OneVanilla.com</strong> and create or log into your account.",
        "Register the card with number, expiration, and CVV.",
        "Dashboard displays current balance and transaction history.",
        "Call <strong>1-877-987-2447</strong> for phone balance on registered cards.",
        "Keep store activation receipt showing paid denomination.",
      ],
      tip: "Register only when planning to spend — for selling, provide clear unregistered card images if your buyer accepts them per trade terms.",
    },
    whyWanted:
      "OneVanilla's wide retail distribution makes it accessible for cash-based buyers. P2P crypto traders frequently exchange OneVanilla for Bitcoin and USDT. General-purpose spending beats store-locked alternatives for flexible shoppers.",
    redemptionNotes:
      "US merchants primarily. Cannot reload — single-load cards. Monthly fee after 12 months on unused balance per card terms.",
    faq: [
      { q: "OneVanilla vs Vanilla Visa?", a: "Related programs with different issuers — both trade actively; select correct type when selling." },
      { q: "CVS OneVanilla accepted?", a: "Yes when rates list OneVanilla/Vanilla tiers." },
      { q: "Must register before selling?", a: "Follow trade instructions — many buyers want unregistered unused cards." },
      { q: "Debit vs gift variant?", a: "Specify physical gift card vs debit-style when opening trade." },
    ],
    metaKeywords: ["OneVanilla balance", "sell OneVanilla card", "OneVanilla Visa Nigeria"],
  }),

  moneypak: profile({
    slug: "moneypak",
    category: "prepaid",
    brand: "Green Dot MoneyPak",
    hook:
      "MoneyPak loads cash onto prepaid debit cards and select accounts — a unique reload product traded distinctly from standard retail gift cards.",
    about:
      "Green Dot Corporation's MoneyPak is a cash reload product sold at US retailers allowing customers to load prepaid debit cards, PayPal, and select financial accounts using a scratch-off MoneyPak number. Unlike closed-loop gift cards, MoneyPak is a transfer mechanism with strict fraud controls and verification. Denominations typically $20–$500. Green Dot tightened MoneyPak usage rules after fraud concerns — legitimate trades require clear receipts and unused codes. MoneyPak appears in rate sheets for experienced P2P traders familiar with Green Dot policies.",
    balanceCheck: {
      intro: "MoneyPak codes are verified through Green Dot's official reload portal before applying to a destination card.",
      steps: [
        "Scratch card gently to reveal the MoneyPak number.",
        "Visit the reload destination's official site (prepaid card issuer or PayPal).",
        "Enter MoneyPak number during Add Money flow.",
        "Green Dot displays validation before confirming load.",
        "Unused MoneyPak shows full face value on packaging and receipt.",
      ],
      tip: "Never share MoneyPak numbers prematurely — treat like cash. Only trade through verified platforms like GiftCard4Sale.",
    },
    whyWanted:
      "Unbanked users load prepaid debit cards via MoneyPak for bill pay and online shopping. P2P traders exchange MoneyPak for crypto where banking access is limited. Cash-heavy economies value MoneyPak's retail availability.",
    redemptionNotes:
      "Loads specific eligible prepaid products — not direct merchant spending. Strict ID and fraud checks on some loads. Sell unused codes only.",
    faq: [
      { q: "Is MoneyPak a gift card?", a: "It's a reload pack — traded similarly with distinct verification on GiftCard4Sale." },
      { q: "Sell unused MoneyPak?", a: "Yes — provide unscratched or verifiable unused codes per trade rules." },
      { q: "PayPal loading?", a: "Policy changes over time — verify current Green Dot/PayPal compatibility if spending." },
      { q: "Common denominations?", a: "$100–$500 tiers frequent in rate tables." },
    ],
    metaKeywords: ["MoneyPak balance", "sell MoneyPak", "Green Dot MoneyPak"],
  }),

  "american-express": profile({
    slug: "american-express",
    category: "prepaid",
    brand: "American Express",
    hook:
      "American Express prepaid gift cards carry the AMEX network prestige with broad merchant acceptance among US businesses that honor American Express.",
    about:
      "American Express Company issues prepaid gift cards usable at merchants accepting Amex — a smaller but premium acceptance network compared to Visa/Mastercard. Amex gift cards sell through amex.com, supermarkets, and corporate gifting programs in US denominations. Registration at amexgiftcard.com enables online purchases with billing address. Amex cards often carry purchase fees upfront. Corporate rewards and survey programs distribute Amex gift cards as high-value incentives.",
    balanceCheck: {
      intro: "American Express gift card balance checks use the Amex gift card portal.",
      steps: [
        "Visit <strong>amexgiftcard.com</strong> or balance URL on card back.",
        "Enter 15-digit card number and 4-digit CID.",
        "Register card with billing ZIP for online use.",
        "Call Amex prepaid customer service on card back.",
        "Retain original purchase receipt for verification.",
      ],
    },
    whyWanted:
      "Premium shoppers at Amex-accepting retailers benefit from discounted prepaid credit. Corporate AMEX rewards convert to cash via resale. Collectors of premium card programs trade Amex alongside Visa variants.",
    redemptionNotes:
      "Cannot use at merchants that don't accept Amex. No ATM cash access on standard gift cards. Replace lost cards only with proof of purchase.",
    faq: [
      { q: "Amex vs Visa gift cards?", a: "Different networks — acceptance and rates differ." },
      { q: "Sell Amex e-gifts?", a: "Yes when unused and supported." },
      { q: "International use?", a: "Primarily US merchants — check card terms." },
      { q: "Activation receipt needed?", a: "May be requested during verification for high-value trades." },
    ],
    metaKeywords: ["Amex gift card balance", "sell American Express gift card", "AMEX prepaid"],
  }),

  "bitsa-visa": profile({
    slug: "bitsa-visa",
    category: "prepaid",
    brand: "Bitsa",
    hook:
      "Bitsa Visa prepaid cards combine cryptocurrency top-ups with traditional Visa spending — popular in Europe for privacy-focused digital payments.",
    about:
      "Bitsa is a European fintech offering Visa prepaid cards fundable via voucher codes, bank transfer, and cryptocurrency without traditional bank accounts. Bitsa vouchers reload card balance for online and contactless spending across the Visa network in supported EU countries. The product targets freelancers, crypto users, and underbanked Europeans. Bitsa cards operate under European e-money regulations with KYC requirements for full features. Voucher codes circulate on P2P markets for below-face-value purchases.",
    balanceCheck: {
      intro: "Bitsa card balance is visible in the Bitsa mobile app after voucher redemption.",
      steps: [
        "Download the <strong>Bitsa app</strong> and complete account verification.",
        "Go to <strong>Top up → Voucher</strong> and enter voucher code.",
        "App dashboard shows available Visa balance.",
        "Unused voucher PINs display denomination on purchase receipt.",
        "Bitsa support assists with invalid voucher disputes.",
      ],
    },
    whyWanted:
      "Crypto earners fund spendable Visa balance through discounted Bitsa vouchers. EU freelancers avoid traditional banking fees. Privacy-conscious shoppers prefer prepaid Visa over linked debit cards.",
    redemptionNotes:
      "EUR-focused product. KYC required for Bitsa account. Voucher must match Bitsa program version — verify before purchase.",
    faq: [
      { q: "Sell Bitsa vouchers?", a: "Yes — unused EUR Bitsa voucher codes when rates are listed." },
      { q: "Bitsa vs Vanilla Visa?", a: "Bitsa is crypto-friendly EU fintech; different product and rates." },
      { q: "Nigeria support?", a: "Bitsa targets EU — sell vouchers internationally for USDT/Naira payout." },
      { q: "Physical card needed?", a: "Voucher codes reload virtual or physical Bitsa Visa." },
    ],
    metaKeywords: ["Bitsa voucher balance", "sell Bitsa card", "Bitsa Visa prepaid"],
  }),

  flexepin: profile({
    slug: "flexepin",
    category: "prepaid",
    brand: "Flexepin",
    hook:
      "Flexepin vouchers are cash-like digital payment codes accepted by hundreds of online merchants — especially gaming, forex, and entertainment sites globally.",
    about:
      "Flexepin is an Australian-founded prepaid voucher system sold at retail outlets and online resellers, redeemable at partner merchants for account top-ups without credit cards. Flexepin PINs come in AUD, CAD, EUR, and other regional denominations. The product is popular for anonymous online payments where users prefer not to share banking details. Gaming sites, trading platforms, and VPN services accept Flexepin where listed. Physical vouchers and digital PINs both trade on secondary markets.",
    balanceCheck: {
      intro: "Flexepin vouchers are typically single-use — balance equals face value until redeemed at a partner merchant.",
      steps: [
        "Locate the 16-digit Flexepin PIN on voucher or email.",
        "Visit <strong>flexepin.com</strong> → Check Voucher Status if available in your region.",
        "Partner merchant checkout validates PIN and shows redeemable amount.",
        "Unused PINs retain full value until redeemed or expired per terms.",
        "Contact Flexepin support with PIN for status verification if needed.",
      ],
    },
    whyWanted:
      "Online gamblers and traders fund accounts without bank trails using Flexepin. Privacy seekers buy discounted vouchers for merchant top-ups. International users in underbanked regions convert Flexepin to platform credit.",
    redemptionNotes:
      "Redeem only at official Flexepin partners. PINs are sensitive — do not expose before trade completion. Regional denomination must match merchant.",
    faq: [
      { q: "Sell Flexepin PINs?", a: "Yes — unused AUD/CAD/EUR PINs when supported." },
      { q: "Flexepin vs Neosurf?", a: "Both are cash voucher systems — separate products and rates." },
      { q: "Partial redemption?", a: "Some merchants allow partial — unused PINs sell at remaining value if verifiable." },
      { q: "Expiry?", a: "Typically 12 months from purchase — sell promptly." },
    ],
    metaKeywords: ["Flexepin voucher", "sell Flexepin", "Flexepin balance check"],
  }),

  neosurf: profile({
    slug: "neosurf",
    category: "prepaid",
    brand: "Neosurf",
    hook:
      "Neosurf vouchers provide anonymous online payment codes used across gaming, e-commerce, and digital services — especially popular in Europe and Africa.",
    about:
      "Neosurf is a French prepaid voucher company offering ticket codes purchasable with cash at retail outlets without bank accounts. Neosurf codes redeem at thousands of online partners for wallet top-ups and purchases. Denominations range from €10 to €100+ with variants like Neosurf Classic and MyNeosurf accounts. The product supports underbanked users in French-speaking Africa and Europe. Neosurf strictly monitors fraud — legitimate resale requires unused ticket codes with purchase proof.",
    balanceCheck: {
      intro: "Neosurf ticket status can be verified through MyNeosurf account or partner redemption flows.",
      steps: [
        "Create account at <strong>myneosurf.com</strong> if using wallet features.",
        "Enter 10-character Neosurf code to check validity during redemption.",
        "Retail purchase receipt confirms face value for unused tickets.",
        "Neosurf mobile app shows wallet balance after code deposit.",
        "Support ticket via neosurf.com for invalid code disputes.",
      ],
    },
    whyWanted:
      "Francophone African users fund online services without international cards. European gamers top up casino and gaming accounts. Cash-based buyers acquire Neosurf at retail and sell digitally for crypto.",
    redemptionNotes:
      "Single-use tickets unless deposited to MyNeosurf wallet. Region and currency specific. Cannot redeem for cash at Neosurf directly.",
    faq: [
      { q: "Sell Neosurf codes on GiftCard4Sale?", a: "Yes — EUR Neosurf tiers when rates are live." },
      { q: "Neosurf Classic vs MyNeosurf?", a: "Classic is one-time ticket; MyNeosurf holds balance — specify when selling." },
      { q: "African Neosurf?", a: "Availability varies — confirm code origin for accurate rates." },
      { q: "Unused only?", a: "Yes — partially used tickets need verifiable remaining value." },
    ],
    metaKeywords: ["Neosurf voucher balance", "sell Neosurf", "Neosurf code Nigeria"],
  }),

  "cashlib-vouchers": profile({
    slug: "cashlib-vouchers",
    category: "prepaid",
    brand: "CASHlib",
    hook:
      "CASHlib vouchers let users pay online with cash-bought codes — bridging convenience stores and digital gaming or forex accounts without credit cards.",
    about:
      "CASHlib is a prepaid voucher network popular in Europe for funding online gaming, trading, and entertainment accounts using cash purchased codes from authorized retailers. Vouchers come in EUR denominations with 16-digit codes. CASHlib emphasizes responsible gaming partnerships and age verification at merchants. The product competes with Paysafecard and Neosurf in the cash-to-digital payment space. P2P traders exchange unused CASHlib codes for cryptocurrency in active markets.",
    balanceCheck: {
      intro: "CASHlib codes are verified during merchant redemption — unused codes hold full printed value.",
      steps: [
        "Find 16-digit CASHlib code on voucher receipt.",
        "Visit partner merchant checkout and select CASHlib payment.",
        "Enter code — system validates remaining value.",
        "CASHlib.com may offer voucher status tools by region.",
        "Keep retail purchase receipt showing denomination paid.",
      ],
    },
    whyWanted:
      "Cash-preferred users fund online accounts without banks. Gamers and traders in EU/Africa seek discounted CASHlib for platform deposits. Privacy and speed drive secondary market demand.",
    redemptionNotes:
      "EUR-focused. Redeem at listed merchants only. Codes expire per terms — typically 6–12 months.",
    faq: [
      { q: "CASHlib vs Paysafecard?", a: "Competing voucher systems — separate rates on GiftCard4Sale." },
      { q: "Sell unused CASHlib?", a: "Yes with verifiable unused 16-digit code." },
      { q: "Partial value?", a: "Some merchants allow partial redemption — verify remaining balance." },
      { q: "Payout currency?", a: "GiftCard4Sale pays USDT, Naira, or Cedi for supported tiers." },
    ],
    metaKeywords: ["CASHlib voucher", "sell CASHlib", "CASHlib balance"],
  }),

  "crypto-voucher": profile({
    slug: "crypto-voucher",
    category: "prepaid",
    brand: "Crypto Voucher",
    hook:
      "Crypto Voucher codes convert retail cash purchases into cryptocurrency credits — a direct bridge between physical stores and digital assets.",
    about:
      "Crypto Voucher (cryptovoucher.io) provides prepaid vouchers redeemable for Bitcoin, Ethereum, and other cryptocurrencies without traditional exchanges. Users buy vouchers at retail partners or online resellers, then redeem codes at cryptovoucher.io for crypto sent to their wallet. Denominations vary in USD and EUR equivalents. The product serves underbanked users seeking crypto exposure through cash. GiftCard4Sale traders exchange unused Crypto Voucher PINs for USDT, aligning with Nigeria and Ghana's active crypto communities.",
    balanceCheck: {
      intro: "Crypto Voucher PINs are validated at redemption on the official Crypto Voucher website.",
      steps: [
        "Visit <strong>cryptovoucher.io/redeem</strong>.",
        "Enter voucher PIN and select target cryptocurrency.",
        "System confirms voucher value before wallet transfer.",
        "Unused PIN denomination appears on purchase receipt.",
        "Support via cryptovoucher.io for invalid PIN reports.",
      ],
    },
    whyWanted:
      "Cash-based crypto buyers avoid KYC exchanges using vouchers. Nigerian and Ghanaian traders arbitrage voucher discounts into USDT holdings. Gift recipients prefer direct USDT over voucher codes.",
    redemptionNotes:
      "Redeem only at official Crypto Voucher site. Network fees may apply to crypto withdrawal. PINs are single-use.",
    faq: [
      { q: "Sell Crypto Voucher PINs?", a: "Yes — unused codes commonly traded for USDT on GiftCard4Sale." },
      { q: "Which crypto?", a: "Redemption choice at cryptovoucher.io — sell unused PIN regardless." },
      { q: "Partial PIN?", a: "Only full unused PINs unless partial balance verifiable." },
      { q: "Scam prevention?", a: "Trade only on verified platforms; never share PINs in DMs." },
    ],
    metaKeywords: ["Crypto Voucher redeem", "sell Crypto Voucher", "crypto voucher to USDT"],
  }),

  "pcs-prepaid-cash-services": profile({
    slug: "pcs-prepaid-cash-services",
    category: "prepaid",
    brand: "PCS",
    hook:
      "PCS Prepaid Cash Services vouchers enable cash-based reloads and payments across European retail networks — a niche but liquid P2P product.",
    about:
      "PCS (Prepaid Cash Services) operates voucher systems in Europe allowing cash-funded account reloads similar to Paysafecard and Neosurf. PCS codes purchase at tobacconists, newsstands, and partner retailers primarily in France and neighboring markets. Merchants accepting PCS include gaming, telecom, and digital service providers. The product targets consumers without credit cards seeking anonymous online payment options.",
    balanceCheck: {
      intro: "PCS voucher validity is confirmed at partner merchant redemption or PCS account portals.",
      steps: [
        "Locate PCS code on printed voucher.",
        "Enter at partner checkout PCS payment field.",
        "PCS account portal may show deposited balance if using wallet mode.",
        "Retail receipt confirms paid denomination.",
        "Contact PCS issuer support listed on voucher for status.",
      ],
    },
    whyWanted:
      "European cash users fund digital services. African diaspora trades EU vouchers for crypto remittance alternatives. Gaming account top-ups drive PCS demand.",
    redemptionNotes:
      "EUR/region specific. Follow PCS terms for eligible merchants. Sell only legitimate unused vouchers.",
    faq: [
      { q: "PCS vs Neosurf?", a: "Both French-origin cash vouchers — different networks and rates." },
      { q: "Sell PCS vouchers?", a: "Yes when EUR PCS tiers appear in calculator." },
      { q: "Wallet vs ticket?", a: "Specify product type when opening trade." },
      { q: "International payout?", a: "GiftCard4Sale converts to Naira, Cedi, or USDT." },
    ],
    metaKeywords: ["PCS voucher", "sell PCS prepaid", "PCS cash services"],
  }),

  "one4all-card": profile({
    slug: "one4all-card",
    category: "prepaid",
    brand: "One4all",
    hook:
      "One4all multi-store gift cards spend at hundreds of participating UK and Ireland retailers — one card covering fashion, dining, homewares, and more.",
    about:
      "One4all is a multi-retailer gift card program popular in the UK and Ireland, accepted at John Lewis, Argos, Primark, and hundreds of other participating merchants listed at one4all.com. One4all Mastercard-branded cards combine multi-store flexibility with payment network acceptance. GBP and EUR programs serve corporate gifting and consumer presents. The wide acceptance network makes One4all distinct from single-brand cards. Digital and physical formats available.",
    balanceCheck: {
      intro: "One4all balance checks are available online for UK and Ireland cards.",
      steps: [
        "Visit <strong>one4all.com</strong> → Check Balance.",
        "Enter card number and CVV.",
        "Phone balance line listed on one4all.com.",
        "Participating store POS may query balance.",
        "One4all app in supported regions.",
      ],
    },
    whyWanted:
      "UK gift recipients choose where to spend — or sell for cash if preferred. Corporate Christmas gifts convert via resale. Tourists buy discounted One4all for flexible UK shopping.",
    redemptionNotes:
      "Spend at participating retailers only — see full list on one4all.com. Mastercard One4all variants have broader acceptance.",
    faq: [
      { q: "Sell One4all cards?", a: "Yes — GBP/EUR One4all when rates are listed." },
      { q: "Ireland vs UK?", a: "Separate programs — confirm card origin." },
      { q: "Multi-store list?", a: "100+ retailers — card works wherever One4all is accepted." },
      { q: "Expiry?", a: "Typically 14 months from purchase — check card." },
    ],
    metaKeywords: ["One4all balance check", "sell One4all card", "One4all gift card UK"],
  }),
};
