import type { GiftCardProfile } from "../types";

function profile(p: GiftCardProfile): GiftCardProfile {
  return p;
}

export const GAMING_PROFILES: Record<string, GiftCardProfile> = {
  blizzard: profile({
    slug: "blizzard",
    category: "gaming",
    brand: "Blizzard",
    hook:
      "Blizzard gift cards power World of Warcraft, Overwatch, Diablo, and Battle.net Store purchases — essential for millions of PC and console gamers in Blizzard's ecosystem.",
    about:
      "Blizzard Entertainment, a division of Activision Blizzard (Microsoft), operates Battle.net — the unified platform for World of Warcraft subscriptions, Diablo IV microtransactions, Overwatch coins, and Hearthstone packs. Blizzard Balance gift cards add funds to Battle.net accounts for games, expansions, and in-game items. Cards are region-locked with separate US, EU, and UK Battle.net wallets. WoW Token mechanics allow gold-to-subscription conversion in-game but gift cards remain the primary external top-up method. Digital codes dominate Blizzard gifting during expansion launches.",
    balanceCheck: {
      intro: "Battle.net displays Blizzard Balance after redeeming a gift card on your account.",
      steps: [
        "Log into <strong>account.battle.net</strong>.",
        "Go to <strong>Account → Payment Methods → Blizzard Balance</strong>.",
        "Click <strong>Redeem Code</strong> and enter the gift card code.",
        "Balance appears immediately after successful redemption.",
        "Battle.net desktop app → Shop → Redeem Code for the same flow.",
      ],
      tip: "Blizzard Balance cannot transfer between regions — match card country to your Battle.net account country.",
    },
    whyWanted:
      "WoW players fund monthly subscriptions and Dragonflight content with discounted Battle.net credit. Overwatch and Diablo seasonal battle passes drive microtransaction demand. Gift cards from game bundles convert to cash when recipients play different titles.",
    redemptionNotes:
      "Funds Battle.net purchases only. Cannot buy other gift cards. Some mobile Blizzard titles may not accept Battle.net balance — verify per game.",
    faq: [
      { q: "Can I sell unredeemed Blizzard codes?", a: "Yes — preferred format. Redeemed Battle.net balance is account-bound." },
      { q: "US vs EU Blizzard cards?", a: "Separate wallets. Select correct region in our calculator." },
      { q: "Do Blizzard cards expire?", a: "Unused codes should be sold promptly; redeemed balance typically does not expire." },
      { q: "Battle.net same as Blizzard?", a: "Yes — Blizzard gift cards add Battle.net Balance." },
    ],
    metaKeywords: ["Blizzard gift card balance", "sell Battle.net card", "Blizzard Balance"],
  }),

  "nintendo-eshop-card": profile({
    slug: "nintendo-eshop-card",
    category: "gaming",
    brand: "Nintendo",
    hook:
      "Nintendo eShop cards unlock Switch games, DLC, and Nintendo Online subscriptions — the prepaid key to Mario, Zelda, and Pokémon digital libraries.",
    about:
      "Nintendo Co., Ltd. sells Nintendo eShop download cards adding funds to Nintendo Accounts for Switch, Switch 2, and legacy 3DS eShop purchases where supported. eShop credit buys digital games, expansions, and Nintendo Switch Online memberships. Cards are strictly region-locked — US codes require US Nintendo Account country settings. Family Group purchases can draw from shared eShop balance in some configurations. Physical cards at GameStop and digital codes from Nintendo.com circulate widely on resale markets.",
    balanceCheck: {
      intro: "Nintendo eShop balance appears on your console or through Nintendo Account management after redemption.",
      steps: [
        "On Nintendo Switch: <strong>eShop → Enter Code</strong> on the left sidebar.",
        "On account.nintendo.com → <strong>Redeem Code</strong> while signed in.",
        "Nintendo Switch Online app shows wallet after redemption.",
        "Pre-redemption: physical card packaging shows face value.",
        "Nintendo Support assists with region-mismatch errors if code won't redeem.",
      ],
    },
    whyWanted:
      "Parents control kids' Switch spending with prepaid eShop cards bought at discounts. Pokémon and Zelda launch day buyers preload wallets. Holiday Switch bundles include eShop credit that non-gamers sell for cash.",
    redemptionNotes:
      "Region must match Nintendo Account. eShop credit cannot move between countries. Nintendo Switch Online auto-renewal draws from eShop balance if enabled.",
    faq: [
      { q: "Can I sell Nintendo eShop codes?", a: "Yes — unused US, UK, and EUR codes commonly trade on GiftCard4Sale." },
      { q: "3DS eShop cards same as Switch?", a: "Modern Nintendo download cards typically fund unified Nintendo Account wallet." },
      { q: "Partial balance sellable?", a: "Only unused codes or verifiable cards — not account-bound redeemed funds." },
      { q: "Do eShop cards expire?", a: "Unused download codes don't expire; redeem or sell promptly." },
    ],
    metaKeywords: ["Nintendo eShop balance", "sell Nintendo gift card", "eShop card to Naira"],
  }),

  "razer-gold": profile({
    slug: "razer-gold",
    category: "gaming",
    brand: "Razer Gold",
    hook:
      "Razer Gold is the unified virtual credit for thousands of games — Mobile Legends, PUBG, Valorant, and more — across Southeast Asia, US, and global markets.",
    about:
      "Razer Inc. operates Razer Gold (formerly zGold-MOL) as a gaming payment platform accepted by hundreds of game publishers for in-game currency and direct top-ups. Razer Gold gift cards and PINs reload Razer Gold wallets used on gold.razer.com and partner games. Regional wallets include USD, EUR, SGD, MYR, and others. Razer Gold Pins are popular in Nigeria, Ghana, and Asia for funding mobile games without international credit cards. Razer Silver rewards loyalty points separately from Gold balance.",
    balanceCheck: {
      intro: "Razer Gold wallet balance is visible after logging into the Razer Gold portal or Razer app.",
      steps: [
        "Visit <strong>gold.razer.com</strong> and sign in with Razer ID.",
        "Dashboard shows current Razer Gold balance by region.",
        "Redeem PIN under <strong>Reload → Razer Gold PIN</strong>.",
        "Razer Gold app displays wallet after PIN redemption.",
        "Unused PIN value is printed on physical cards or email receipts.",
      ],
    },
    whyWanted:
      "Mobile gamers in Africa and Asia fund MLBB diamonds and Free Fire credits through discounted Razer Gold. PC gamers buy Valorant points without card fees. Crypto communities trade Razer Gold for USDT due to P2P liquidity.",
    redemptionNotes:
      "Select correct regional wallet when redeeming. Razer Gold spends on partner games only — not Razer hardware store. Pins are single-use.",
    faq: [
      { q: "Does GiftCard4Sale buy Razer Gold PINs?", a: "Yes — US, EUR, SGD, and other tiers when rates are live." },
      { q: "Razer Gold vs Razer Silver?", a: "Gold is paid wallet currency; Silver is loyalty rewards — different products." },
      { q: "Green Razer cards?", a: "Some tiers reference Green Razer promotions — enter exact product type when trading." },
      { q: "Sell unredeemed PIN?", a: "Yes — provide unused PIN without redeeming to your Razer ID." },
    ],
    metaKeywords: ["Razer Gold balance", "sell Razer Gold PIN", "Razer Gold Nigeria"],
  }),

  microsoft: profile({
    slug: "microsoft",
    category: "gaming",
    brand: "Microsoft",
    hook:
      "Microsoft gift cards fund Xbox, Microsoft 365, Windows Store apps, and Surface accessories — versatile credit across the Microsoft ecosystem.",
    about:
      "Microsoft Corporation issues gift cards redeemable to Microsoft account balance for digital purchases across Xbox, Windows Store, and select Microsoft.com hardware. Credit applies to Game Pass, movies, Office subscriptions (where eligible), and apps. Cards are region-specific. Microsoft gift cards differ from Xbox-branded cards in packaging but often share the same redemption infrastructure. Corporate Microsoft Rewards redemptions and bundle promotions feed secondary supply.",
    balanceCheck: {
      intro: "Microsoft account balance is unified across Xbox and Microsoft Store on PC.",
      steps: [
        "Visit <strong>account.microsoft.com/billing/redeem</strong>.",
        "Enter the 25-character code.",
        "View balance at <strong>account.microsoft.com → Payment & billing</strong>.",
        "Xbox console: Store → Use a code.",
        "Microsoft Store app on Windows → Redeem.",
      ],
    },
    whyWanted:
      "Office 365 subscribers, Xbox gamers, and Windows app buyers seek discounted Microsoft credit. Enterprise gift programs convert to cash for employees. Cross-platform Game Pass PC+Xbox users maximize unified balance.",
    redemptionNotes:
      "Region-locked Microsoft accounts. Cannot buy physical Surface with standard digital gift cards in all regions — verify eligibility.",
    faq: [
      { q: "Microsoft vs Xbox gift cards?", a: "Often redeem to the same Microsoft account balance — branding differs." },
      { q: "EUR Microsoft cards?", a: "Yes when EUR tiers are listed." },
      { q: "Sell digital codes?", a: "Yes if unused." },
      { q: "Microsoft 365 eligible?", a: "Some subscriptions accept account balance — check Microsoft billing." },
    ],
    metaKeywords: ["Microsoft gift card balance", "sell Microsoft card", "Microsoft account balance"],
  }),

  eneba: profile({
    slug: "eneba",
    category: "gaming",
    brand: "Eneba",
    hook:
      "Eneba gift cards and wallet credit unlock discounted game keys, DLC, and gift cards on one of Europe's largest digital game marketplaces.",
    about:
      "Eneba is a Lithuanian-founded digital marketplace connecting buyers and sellers of game keys, gift cards, and software licenses globally. Eneba wallet top-ups fund purchases with buyer protection on listed products. The platform competes with G2A and Kinguin on price for Steam, Xbox, and PlayStation keys. Eneba gift cards or wallet vouchers appeal to gamers hunting deals outside official store pricing. EUR and USD wallet denominations dominate trading.",
    balanceCheck: {
      intro: "Eneba wallet balance is managed inside your Eneba account after logging in.",
      steps: [
        "Sign into <strong>eneba.com</strong> with your account.",
        "Go to <strong>Wallet</strong> in account settings.",
        "Redeem voucher code under Add funds.",
        "Balance displays before checkout on any listing.",
        "Unused voucher PINs show denomination on purchase email.",
      ],
    },
    whyWanted:
      "Deal hunters preload Eneba wallets during sales for instant key purchases. International gamers access regional pricing through Eneba listings. Unused marketplace credit converts to USDT via external sale.",
    redemptionNotes:
      "Eneba wallet spends on Eneba marketplace only. Buyer protection applies to eligible purchases. Not valid on external stores directly.",
    faq: [
      { q: "Can I sell Eneba wallet codes?", a: "Yes — unused Eneba voucher codes accepted when rates are available." },
      { q: "Eneba vs Steam cards?", a: "Eneba sells Steam keys; Eneba wallet is marketplace-specific credit." },
      { q: "Region locks?", a: "Wallet currency matters — EUR vs USD wallets are separate." },
      { q: "Trust Eneba codes?", a: "Sell only official unused codes from legitimate purchases." },
    ],
    metaKeywords: ["Eneba wallet balance", "sell Eneba gift card", "Eneba voucher"],
  }),

  roblox: profile({
    slug: "roblox",
    category: "gaming",
    brand: "Roblox",
    hook:
      "Roblox gift cards convert to Robux — the platform currency powering avatar customization and experiences for over 200 million monthly users, especially younger gamers.",
    about:
      "Roblox Corporation operates a user-generated gaming platform where Robux purchases unlock avatar items, game passes, and developer products. Roblox gift cards redeem exclusively at roblox.com/redeem into Robux balances tied to a Roblox account. Cards sell at Walmart, Target, Amazon, and game stores in $10–$200 US denominations. Parental controls and monthly spend limits make Roblox cards a preferred gifting method for kids. Robux has no official cash-out — external sale of unused gift cards provides liquidity for recipients.",
    balanceCheck: {
      intro: "Roblox displays Robux balance after redeeming gift card credit to an account.",
      steps: [
        "Log into <strong>roblox.com</strong> and go to <strong>Robux → Redeem Gift Card</strong>.",
        "Enter the PIN from physical card or digital delivery.",
        "Robux credit applies instantly to the logged-in account.",
        "Mobile Roblox app → More → Redeem Gift Card.",
        "Unused cards show face value on packaging before redemption.",
      ],
      tip: "Once redeemed, Robux cannot be transferred back to a sellable gift card code.",
    },
    whyWanted:
      "Parents cap kids' Robux spending with prepaid cards bought at slight discounts. Roblox creators funding dev products seek affordable Robux. Birthday gifts convert to cash when recipients prefer other platforms.",
    redemptionNotes:
      "Redeem at roblox.com/redeem only. Robux is account-bound. Premium subscription can draw from gift card redemption bundles.",
    faq: [
      { q: "Sell Roblox gift cards on GiftCard4Sale?", a: "Yes — $25–$300 US tiers commonly supported." },
      { q: "Robux vs Roblox card?", a: "Gift cards redeem into Robux — sell unused cards, not account Robux." },
      { q: "Physical vs digital?", a: "Both accepted when unused." },
      { q: "Do Roblox cards expire?", a: "Unused PINs don't expire — trade promptly for security." },
    ],
    metaKeywords: ["Roblox gift card balance", "sell Roblox card", "Roblox to Naira"],
  }),
};
