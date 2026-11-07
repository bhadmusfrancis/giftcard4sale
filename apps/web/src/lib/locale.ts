// Locale detection + shared constants for site localization.
// "lang" is a BCP-47-ish tag (en, fr, pt-br, zh-hans...). Detection order lives
// in middleware.ts (geo header -> Accept-Language); this module maps countries
// to their most widely used language and exposes helpers for client code.

export const LANG_COOKIE = "gc4s_lang";
export const COUNTRY_COOKIE = "gc4s_country";

const TAG_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8}){0,2}$/i;

export function normalizeLang(raw: unknown): string {
  if (typeof raw !== "string") return "en";
  const tag = raw.trim().toLowerCase().replace(/_/g, "-");
  if (!TAG_RE.test(tag)) return "en";
  const primary = tag.split("-")[0];
  return /^[a-z]{2,3}$/.test(primary) ? tag : "en";
}

export function parseAcceptLanguage(header: string | null | undefined): string {
  if (!header) return "en";
  const first = header.split(",")[0]?.trim().split(";")[0]?.trim();
  return normalizeLang(first || "en");
}

// ISO 3166-1 alpha-2 -> dominant language tag. Covers the gift-card trading
// markets plus the world's major language regions; unlisted countries fall
// back to the visitor's browser language, then English.
const COUNTRY_TO_LANG: Record<string, string> = {
  // English
  US: "en", GB: "en", NG: "en", GH: "en", KE: "en", ZA: "en", IE: "en", AU: "en",
  NZ: "en", CA: "en", JM: "en", TT: "en", GY: "en", BZ: "en", BS: "en", BB: "en",
  PH: "en", IN: "en", PK: "en", SG: "en", MT: "en", LR: "en", SL: "en", GM: "en",
  MW: "en", ZM: "en", ZW: "en", BW: "en", UG: "en", FJ: "en",
  // French
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr", CI: "fr", SN: "fr", ML: "fr",
  BF: "fr", NE: "fr", TG: "fr", BJ: "fr", GN: "fr", TD: "fr", CF: "fr", CG: "fr",
  CD: "fr", GA: "fr", DJ: "fr", KM: "fr", MG: "fr", HT: "fr", RW: "fr", BI: "fr",
  MR: "fr", GP: "fr", MQ: "fr", GF: "fr", RE: "fr", CM: "fr",
  // Spanish
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
  BO: "es", PY: "es", UY: "es", CR: "es", PA: "es", DO: "es", CU: "es", GT: "es",
  HN: "es", SV: "es", NI: "es", PR: "es", GQ: "es",
  // Portuguese
  PT: "pt", BR: "pt-br", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  // Arabic
  SA: "ar", AE: "ar", EG: "ar", MA: "ar", DZ: "ar", TN: "ar", LY: "ar", SD: "ar",
  IQ: "ar", SY: "ar", JO: "ar", LB: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar",
  YE: "ar", PS: "ar", SS: "ar",
  // Other major languages
  CN: "zh-cn", HK: "zh-tw", TW: "zh-tw", MO: "zh-tw",
  JP: "ja", KR: "ko", VN: "vi", TH: "th", ID: "id", MY: "ms",
  TR: "tr", RU: "ru", UA: "uk", PL: "pl", DE: "de", AT: "de", LI: "de",
  IT: "it", NL: "nl", SE: "sv", NO: "no", DK: "da", FI: "fi", IS: "is",
  GR: "el", CZ: "cs", SK: "sk", HU: "hu", RO: "ro", BG: "bg", HR: "hr",
  RS: "sr", BA: "bs", SI: "sl", AL: "sq", MK: "mk", EE: "et", LV: "lv",
  LT: "lt", BY: "be", KZ: "kk", UZ: "uz", AZ: "az", GE: "ka", AM: "hy",
  MN: "mn", KH: "km", LA: "lo", MM: "my", NP: "ne", BD: "bn", LK: "si",
  ET: "am", ER: "ti", SO: "so", TZ: "sw",
  IR: "fa", AF: "fa", IL: "he",
};

export function langFromCountry(cc: string | null | undefined): string {
  if (!cc) return "en";
  return COUNTRY_TO_LANG[cc.toUpperCase()] || "en";
}

// Languages offered in the picker (auto-detect can still produce any tag).
export const LANGUAGE_OPTIONS: { tag: string; label: string }[] = [
  { tag: "en", label: "English" },
  { tag: "fr", label: "Français" },
  { tag: "es", label: "Español" },
  { tag: "pt-br", label: "Português (Brasil)" },
  { tag: "ar", label: "العربية" },
  { tag: "zh-cn", label: "" },
  { tag: "hi", label: "हिन्दी" },
  { tag: "ru", label: "Русский" },
  { tag: "tr", label: "Türkçe" },
  { tag: "de", label: "Deutsch" },
  { tag: "it", label: "Italiano" },
  { tag: "nl", label: "Nederlands" },
  { tag: "vi", label: "Tiếng Việt" },
  { tag: "ko", label: "한국어" },
  { tag: "ja", label: "" },
  { tag: "yo", label: "Yorùbá" },
  { tag: "ha", label: "Hausa" },
  { tag: "ig", label: "Igbo" },
  { tag: "sw", label: "Kiswahili" },
  { tag: "tw", label: "Twi" },
];

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

export function isRtl(lang: string): boolean {
  return RTL_LANGS.has(lang.split("-")[0]);
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}
