/** Official brand URLs used for daily insight research. */
export interface BrandSources {
  website?: string;
  giftCardPage?: string;
  x?: string;
  facebook?: string;
  instagram?: string;
  newsroom?: string;
}

const SOURCES: Record<string, BrandSources> = {
  amazon: {
    website: "https://www.amazon.com",
    giftCardPage: "https://www.amazon.com/gift-cards/b",
    x: "https://x.com/amazon",
    facebook: "https://www.facebook.com/Amazon",
    instagram: "https://www.instagram.com/amazon/",
    newsroom: "https://www.aboutamazon.com/news",
  },
  itunes: {
    website: "https://www.apple.com",
    giftCardPage: "https://www.apple.com/shop/gift-cards",
    x: "https://x.com/Apple",
    facebook: "https://www.facebook.com/apple",
    instagram: "https://www.instagram.com/apple/",
    newsroom: "https://www.apple.com/newsroom/",
  },
  "apple-gift-card-us-only": {
    website: "https://www.apple.com",
    giftCardPage: "https://www.apple.com/shop/gift-cards",
    x: "https://x.com/Apple",
    newsroom: "https://www.apple.com/newsroom/",
  },
  "apple-store": {
    website: "https://www.apple.com/retail/",
    giftCardPage: "https://www.apple.com/shop/gift-cards",
    x: "https://x.com/Apple",
    newsroom: "https://www.apple.com/newsroom/",
  },
  "google-play": {
    website: "https://play.google.com",
    giftCardPage: "https://play.google.com/about/giftcards",
    x: "https://x.com/GooglePlay",
    facebook: "https://www.facebook.com/googleplay",
    newsroom: "https://blog.google/products/google-play/",
  },
  "steam-wallet": {
    website: "https://store.steampowered.com",
    giftCardPage: "https://store.steampowered.com/digitalgiftcards/",
    x: "https://x.com/steam",
    facebook: "https://www.facebook.com/Steam",
    newsroom: "https://store.steampowered.com/news/",
  },
  xbox: {
    website: "https://www.xbox.com",
    giftCardPage: "https://www.xbox.com/en-US/gift-cards",
    x: "https://x.com/Xbox",
    facebook: "https://www.facebook.com/xbox",
    instagram: "https://www.instagram.com/xbox/",
    newsroom: "https://news.xbox.com/",
  },
  "playstation-network": {
    website: "https://www.playstation.com",
    giftCardPage: "https://www.playstation.com/en-us/playstation-gift-cards/",
    x: "https://x.com/PlayStation",
    facebook: "https://www.facebook.com/PlayStation",
    instagram: "https://www.instagram.com/playstation/",
    newsroom: "https://blog.playstation.com/",
  },
  microsoft: {
    website: "https://www.microsoft.com",
    giftCardPage: "https://www.microsoft.com/en-us/store/b/gift-cards",
    x: "https://x.com/Microsoft",
    newsroom: "https://news.microsoft.com/",
  },
  nintendo: {
    website: "https://www.nintendo.com",
    giftCardPage: "https://www.nintendo.com/us/store/products/nintendo-eshop-gift-card/",
    x: "https://x.com/NintendoAmerica",
    facebook: "https://www.facebook.com/Nintendo",
    newsroom: "https://www.nintendo.com/us/whatsnew/",
  },
  "nintendo-eshop-card": {
    website: "https://www.nintendo.com",
    giftCardPage: "https://www.nintendo.com/us/store/products/nintendo-eshop-gift-card/",
    x: "https://x.com/NintendoAmerica",
    newsroom: "https://www.nintendo.com/us/whatsnew/",
  },
  roblox: {
    website: "https://www.roblox.com",
    giftCardPage: "https://www.roblox.com/giftcards",
    x: "https://x.com/Roblox",
    facebook: "https://www.facebook.com/Roblox",
    newsroom: "https://corp.roblox.com/news",
  },
  blizzard: {
    website: "https://www.blizzard.com",
    giftCardPage: "https://us.shop.battle.net/en-us",
    x: "https://x.com/Blizzard_Ent",
    newsroom: "https://news.blizzard.com/",
  },
  "best-buy": {
    website: "https://www.bestbuy.com",
    giftCardPage: "https://www.bestbuy.com/site/electronics/gift-cards/cat09000.c",
    x: "https://x.com/BestBuy",
    facebook: "https://www.facebook.com/bestbuy",
    newsroom: "https://corporate.bestbuy.com/news-and-insights/",
  },
  "home-depot": {
    website: "https://www.homedepot.com",
    giftCardPage: "https://www.homedepot.com/c/gift_cards",
    x: "https://x.com/HomeDepot",
    facebook: "https://www.facebook.com/homedepot",
    newsroom: "https://corporate.homedepot.com/newsroom",
  },
  "lowe-s": {
    website: "https://www.lowes.com",
    giftCardPage: "https://www.lowes.com/l/gift-cards",
    x: "https://x.com/Lowes",
    facebook: "https://www.facebook.com/lowes",
    newsroom: "https://corporate.lowes.com/newsroom",
  },
  walmart: {
    website: "https://www.walmart.com",
    giftCardPage: "https://www.walmart.com/cp/gift-cards/96894",
    x: "https://x.com/Walmart",
    facebook: "https://www.facebook.com/walmart",
    newsroom: "https://corporate.walmart.com/news",
  },
  target: {
    website: "https://www.target.com",
    giftCardPage: "https://www.target.com/c/gift-cards/-/N-5xsxu",
    x: "https://x.com/Target",
    facebook: "https://www.facebook.com/target",
    newsroom: "https://corporate.target.com/news-features",
  },
  nike: {
    website: "https://www.nike.com",
    giftCardPage: "https://www.nike.com/gift-cards",
    x: "https://x.com/Nike",
    instagram: "https://www.instagram.com/nike/",
    newsroom: "https://about.nike.com/en/newsroom",
  },
  adidas: {
    website: "https://www.adidas.com",
    giftCardPage: "https://www.adidas.com/us/gift_cards",
    x: "https://x.com/adidas",
    instagram: "https://www.instagram.com/adidas/",
    newsroom: "https://www.adidas-group.com/en/media/news-archive",
  },
  sephora: {
    website: "https://www.sephora.com",
    giftCardPage: "https://www.sephora.com/beauty/giftcards",
    x: "https://x.com/sephora",
    instagram: "https://www.instagram.com/sephora/",
    newsroom: "https://newsroom.sephora.com/",
  },
  starbucks: {
    website: "https://www.starbucks.com",
    giftCardPage: "https://www.starbucks.com/gift",
    x: "https://x.com/Starbucks",
    instagram: "https://www.instagram.com/starbucks/",
    newsroom: "https://stories.starbucks.com/",
  },
  "starbucks-card": {
    website: "https://www.starbucks.com",
    giftCardPage: "https://www.starbucks.com/gift",
    x: "https://x.com/Starbucks",
    newsroom: "https://stories.starbucks.com/",
  },
  doordash: {
    website: "https://www.doordash.com",
    giftCardPage: "https://www.doordash.com/gift-cards/",
    x: "https://x.com/DoorDash",
    newsroom: "https://about.doordash.com/en-us/news",
  },
  airbnb: {
    website: "https://www.airbnb.com",
    giftCardPage: "https://www.airbnb.com/gift",
    x: "https://x.com/Airbnb",
    instagram: "https://www.instagram.com/airbnb/",
    newsroom: "https://news.airbnb.com/",
  },
  visa: {
    website: "https://www.visa.com",
    giftCardPage: "https://usa.visa.com/pay-with-visa/gift-cards.html",
    x: "https://x.com/Visa",
    newsroom: "https://usa.visa.com/about-visa/newsroom.html",
  },
  ebay: {
    website: "https://www.ebay.com",
    giftCardPage: "https://www.ebay.com/giftcards",
    x: "https://x.com/eBay",
    newsroom: "https://www.ebayinc.com/stories/news/",
  },
  gamestop: {
    website: "https://www.gamestop.com",
    giftCardPage: "https://www.gamestop.com/gift-cards",
    x: "https://x.com/GameStop",
    newsroom: "https://news.gamestop.com/",
  },
  nordstrom: {
    website: "https://www.nordstrom.com",
    giftCardPage: "https://www.nordstrom.com/browse/gift-cards",
    x: "https://x.com/Nordstrom",
    newsroom: "https://press.nordstrom.com/",
  },
  netflix: {
    website: "https://www.netflix.com",
    giftCardPage: "https://www.netflix.com/gift-cards",
    x: "https://x.com/netflix",
    instagram: "https://www.instagram.com/netflix/",
    newsroom: "https://about.netflix.com/en/news",
  },
  spotify: {
    website: "https://www.spotify.com",
    giftCardPage: "https://www.spotify.com/us/gift-cards/",
    x: "https://x.com/Spotify",
    newsroom: "https://newsroom.spotify.com/",
  },
  uber: {
    website: "https://www.uber.com",
    giftCardPage: "https://www.uber.com/us/en/gift-cards/",
    x: "https://x.com/Uber",
    newsroom: "https://www.uber.com/newsroom/",
  },
  "delta-air-line": {
    website: "https://www.delta.com",
    giftCardPage: "https://www.delta.com/us/en/gift-cards/overview",
    x: "https://x.com/Delta",
    newsroom: "https://news.delta.com/",
  },
  instacart: {
    website: "https://www.instacart.com",
    giftCardPage: "https://www.instacart.com/gift-cards",
    x: "https://x.com/Instacart",
    newsroom: "https://www.instacart.com/company/news",
  },
  "disney-gift-cards": {
    website: "https://www.disney.com",
    giftCardPage: "https://www.disneygiftcard.com/home/",
    x: "https://x.com/Disney",
    newsroom: "https://thewaltdisneycompany.com/news/",
  },
};

function guessDomain(brand: string): string {
  const cleaned = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/giftcards?$/i, "");
  return cleaned || "brand";
}

/** Resolve official URLs for a card slug; falls back to guessed domains. */
export function resolveBrandSources(slug: string, brand: string): BrandSources {
  const known = SOURCES[slug];
  if (known) return known;

  const domain = guessDomain(brand);
  return {
    website: `https://www.${domain}.com`,
    giftCardPage: `https://www.${domain}.com/gift-cards`,
    x: `https://x.com/${domain}`,
    facebook: `https://www.facebook.com/${domain}`,
    instagram: `https://www.instagram.com/${domain}/`,
  };
}

/** All fetchable URLs for research (deduped, ordered by priority). */
export function listResearchUrls(sources: BrandSources): { label: string; url: string }[] {
  const entries: { label: string; url: string }[] = [];
  const push = (label: string, url?: string) => {
    if (url && !entries.some((e) => e.url === url)) entries.push({ label, url });
  };
  push("Newsroom", sources.newsroom);
  push("Official website", sources.website);
  push("Gift cards", sources.giftCardPage);
  push("X (Twitter)", sources.x);
  push("Facebook", sources.facebook);
  push("Instagram", sources.instagram);
  return entries;
}
