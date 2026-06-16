/** Map GiftCard4Sale card types to NoOnes payment-method slugs. */
const SLUG_MAP: Record<string, string> = {
  "apple-itunes": "itunes-gift-card",
  "apple-itunes-gift-card": "itunes-gift-card",
  amazon: "amazon-gift-card",
  steam: "steam-wallet-gift-card",
  "x-box": "xbox-gift-card",
  xbox: "xbox-gift-card",
  playstation: "playstation-network-gift-card",
  google: "google-play-gift-card",
  "google-play": "google-play-gift-card",
  ebay: "ebay-gift-card",
  walmart: "walmart-gift-card",
  target: "target-gift-card",
  netflix: "netflix-gift-card",
  spotify: "spotify-gift-card",
  razer: "razer-gold-gift-card",
  sephora: "sephora-gift-card",
  nordstrom: "nordstrom-gift-card",
  footlocker: "foot-locker-gift-card",
  macy: "macys-gift-card",
  macys: "macys-gift-card",
  roblox: "roblox-gift-card",
  doordash: "doordash-gift-card",
  chime: "chime-gift-card",
};

const NAME_PATTERNS: [RegExp, string][] = [
  [/apple|itunes/i, "itunes-gift-card"],
  [/amazon/i, "amazon-gift-card"],
  [/steam/i, "steam-wallet-gift-card"],
  [/x-?box/i, "xbox-gift-card"],
  [/playstation|psn/i, "playstation-network-gift-card"],
  [/google/i, "google-play-gift-card"],
  [/ebay/i, "ebay-gift-card"],
  [/walmart/i, "walmart-gift-card"],
  [/target/i, "target-gift-card"],
  [/netflix/i, "netflix-gift-card"],
  [/spotify/i, "spotify-gift-card"],
  [/razer/i, "razer-gold-gift-card"],
  [/sephora/i, "sephora-gift-card"],
  [/nordstrom/i, "nordstrom-gift-card"],
  [/foot\s?locker/i, "foot-locker-gift-card"],
  [/macy/i, "macys-gift-card"],
  [/roblox/i, "roblox-gift-card"],
  [/doordash/i, "doordash-gift-card"],
  [/chime/i, "chime-gift-card"],
  [/gamestop/i, "gamestop-gift-card"],
  [/lowes/i, "lowes-gift-card"],
  [/home\s?depot/i, "home-depot-gift-card"],
  [/visa/i, "visa-gift-card"],
  [/vanilla/i, "vanilla-gift-card"],
];

export function resolvePaymentMethodSlug(
  cardSlug: string,
  cardName: string,
  override?: string | null
): string | null {
  if (override?.trim()) return override.trim();

  const normalized = cardSlug.toLowerCase().replace(/-gift-card$/, "");
  if (SLUG_MAP[normalized]) return SLUG_MAP[normalized];
  if (SLUG_MAP[cardSlug]) return SLUG_MAP[cardSlug];

  for (const [re, slug] of NAME_PATTERNS) {
    if (re.test(cardName)) return slug;
  }

  // Best-effort guess used when syncing; may not match every brand.
  const guess = `${normalized.replace(/[^a-z0-9-]/g, "")}-gift-card`;
  return guess.length > 5 ? guess : null;
}
