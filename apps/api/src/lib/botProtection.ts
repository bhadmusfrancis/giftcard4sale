import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { env } from "../env";
import { prisma } from "../prisma";

/**
 * Layered bot protection for the public registration endpoint:
 *  1. registerLimiter    — strict per-IP limit (registrations are rare per human).
 *  2. register challenge — signed, timestamped token the register page must fetch
 *                          first; rejects submissions faster than a human could type.
 *  3. honeypot           — hidden "website" field; only bots fill it.
 *  4. email hygiene      — disposable/abusive domains (and subdomains) blocked,
 *                          per-domain signup velocity capped, gmail dot/plus
 *                          aliases normalized so one inbox cannot mass-register.
 *  5. Turnstile CAPTCHA  — enforced when TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY are set.
 */

// ---- 1. Strict rate limit for account creation ----
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts created from this network. Please try again later." },
});

// ---- 2. Signed registration challenge (proof the register page was loaded) ----
const CHALLENGE_MIN_AGE_MS = 1500; // faster than 1.5s is unlikely for a real user
const CHALLENGE_MAX_AGE_MS = 30 * 60 * 1000; // stale after 30 minutes

function challengeSignature(timestamp: string): string {
  return crypto.createHmac("sha256", env.jwtSecret).update(`register:${timestamp}`).digest("hex");
}

export function issueRegisterChallenge(): string {
  const ts = Date.now().toString();
  return `${ts}.${challengeSignature(ts)}`;
}

export function verifyRegisterChallenge(challenge: string | undefined): { ok: boolean; error?: string } {
  if (!challenge || typeof challenge !== "string") {
    return { ok: false, error: "Registration challenge missing. Please reload the page and try again." };
  }
  const [ts, sig] = challenge.split(".");
  if (!ts || !sig) return { ok: false, error: "Invalid registration challenge. Please reload the page." };

  const expected = challengeSignature(ts);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, error: "Invalid registration challenge. Please reload the page." };
  }

  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age > CHALLENGE_MAX_AGE_MS) {
    return { ok: false, error: "Registration session expired. Please reload the page and try again." };
  }
  if (age < CHALLENGE_MIN_AGE_MS) {
    // Submitted quicker than any human can fill the form.
    return { ok: false, error: "Form submitted too quickly. Please try again." };
  }
  return { ok: true };
}

// ---- 3. Honeypot ----
export function isHoneypotTripped(body: unknown): boolean {
  const website = (body as Record<string, unknown> | null)?.website;
  return typeof website === "string" && website.trim().length > 0;
}

// ---- 4. Email hygiene ----
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.dev",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.net",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "mailnesia.com",
  "trashmail.com",
  "fakeinbox.com",
  "mytemp.email",
  "mohmal.com",
  "moakt.com",
  "tmpmail.org",
  "tmpmail.net",
  "emailondeck.com",
  "spamgourmet.com",
  "mintemail.com",
  "mailcatch.com",
  "inboxkitten.com",
  "burnermail.io",
  "33mail.com",
]);

// Domains seen mass-registering bot accounts. Extend at runtime via BLOCKED_EMAIL_DOMAINS.
const ABUSIVE_DOMAINS = ["workinc.top"];

const BLOCKED_DOMAINS = new Set([
  ...DISPOSABLE_DOMAINS,
  ...ABUSIVE_DOMAINS,
  ...env.registration.blockedEmailDomains,
]);

export function emailDomain(email: string): string {
  return email.split("@")[1]?.trim().toLowerCase() ?? "";
}

/** True for blocked domains and any of their subdomains (e.g. mx.workinc.top). */
export function isDisposableEmail(email: string): boolean {
  const labels = emailDomain(email).split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (BLOCKED_DOMAINS.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

// Large consumer providers are exempt from the per-domain velocity cap.
const COMMON_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
]);

// Second-level public suffixes where the registrable domain is three labels
// (e.g. example.com.ng, example.co.uk) rather than two (workinc.top).
const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.ng", "org.ng", "net.ng", "gov.ng", "edu.ng",
  "com.gh", "org.gh", "co.za", "co.ke", "or.ke", "co.in",
  "com.au", "net.au", "org.au", "com.br", "com.mx", "co.nz",
  "com.sg", "com.my", "com.pk", "com.ph", "com.tw", "com.hk",
  "com.vn", "com.id", "com.ar", "com.co", "com.pe", "com.sa",
  "com.eg", "com.tr", "co.jp",
]);

/** Registrable domain for an email host: last two labels, or three under a multi-label suffix. */
function apexDomain(domain: string): string {
  const labels = domain.split(".");
  if (labels.length <= 2) return domain;
  const last2 = labels.slice(-2).join(".");
  return MULTI_LABEL_SUFFIXES.has(last2) ? labels.slice(-3).join(".") : last2;
}

/**
 * Bots rotate IPs but tend to reuse one custom domain. Caps new accounts per
 * non-consumer domain in a rolling 24h window so the next wave is stopped
 * automatically, without waiting for a manual blocklist entry. Counts by apex
 * domain so subdomain rotation (a@1.x.top, b@2.x.top) cannot bypass the cap,
 * and ignores banned accounts so a cleaned-up wave does not block later signups.
 */
export async function isDomainVelocityExceeded(email: string): Promise<boolean> {
  const domain = emailDomain(email);
  const max = env.registration.maxPerDomainPerDay;
  if (!domain || max <= 0 || COMMON_PROVIDERS.has(domain) || MULTI_LABEL_SUFFIXES.has(domain)) {
    return false;
  }
  const apex = apexDomain(domain);
  if (COMMON_PROVIDERS.has(apex)) return false;
  const recent = await prisma.user.count({
    where: {
      accountStatus: { not: "BANNED" },
      OR: [
        { email: { endsWith: `@${apex}`, mode: "insensitive" } },
        { email: { endsWith: `.${apex}`, mode: "insensitive" } },
      ],
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent >= max) {
    console.warn(`[botProtection] registration blocked: ${recent} signups from ${apex} in 24h`);
    return true;
  }
  return false;
}

/**
 * Gmail ignores dots and everything after "+" in the local part, so
 * "i.w.aj+1@gmail.com" and "iwaj@gmail.com" are the same inbox. Returns the
 * canonical local part for gmail addresses, or null for other providers.
 */
export function gmailCanonicalLocalPart(email: string): string | null {
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || (domain !== "gmail.com" && domain !== "googlemail.com")) return null;
  return local.replace(/\./g, "").split("+")[0];
}

// ---- 5. Cloudflare Turnstile (on when both site + secret keys are configured) ----
export const CAPTCHA_ACTION = "register";

export function isCaptchaEnabled(): boolean {
  return Boolean(env.turnstile.siteKey && env.turnstile.secretKey);
}

/** Public site key for the register page; null when CAPTCHA is off. */
export function captchaSiteKey(): string | null {
  return isCaptchaEnabled() ? env.turnstile.siteKey : null;
}

export async function verifyCaptcha(token: string | undefined, ip?: string): Promise<boolean> {
  if (!isCaptchaEnabled()) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.turnstile.secretKey,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    const data = (await res.json()) as { success?: boolean; action?: string; "error-codes"?: string[] };
    if (data.success !== true || data.action !== CAPTCHA_ACTION) {
      console.warn("[botProtection] Turnstile rejected:", data["error-codes"]?.join(",") || data.action);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[botProtection] Turnstile verify failed:", (err as Error).message);
    // Fail closed: if the CAPTCHA provider is unreachable, do not let signups through.
    return false;
  }
}
