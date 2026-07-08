import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { env } from "../env";

/**
 * Layered bot protection for the public registration endpoint:
 *  1. registerLimiter    — strict per-IP limit (registrations are rare per human).
 *  2. register challenge — signed, timestamped token the register page must fetch
 *                          first; rejects submissions faster than a human could type.
 *  3. honeypot           — hidden "website" field; only bots fill it.
 *  4. email hygiene      — disposable domains blocked, gmail dot/plus aliases
 *                          normalized so one inbox cannot mass-register.
 *  5. Turnstile CAPTCHA  — enforced when TURNSTILE_SECRET_KEY is configured.
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

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
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

// ---- 5. Cloudflare Turnstile (optional, on when secret key is configured) ----
export function isCaptchaEnabled(): boolean {
  return Boolean(env.turnstile.secretKey);
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
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[botProtection] Turnstile verify failed:", (err as Error).message);
    // Fail closed: if the CAPTCHA provider is unreachable, do not let signups through.
    return false;
  }
}
