// BCP-47-ish language tag handling. We keep tags lowercased and accept
// "fr", "pt-br", "zh-hans", etc. Anything unrecognized falls back to "en".
const TAG_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8}){0,2}$/;

export function normalizeLocale(raw: unknown): string {
  if (typeof raw !== "string") return "en";
  const tag = raw.trim().toLowerCase().replace(/_/g, "-");
  if (!TAG_RE.test(tag)) return "en";
  const primary = tag.split("-")[0];
  return /^[a-z]{2,3}$/.test(primary) ? tag : "en";
}

export function isValidLocale(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  return TAG_RE.test(raw.trim().toLowerCase().replace(/_/g, "-"));
}

export function normalizeCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cc = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : null;
}
