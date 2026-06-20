import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";

export type EmailTransport = "brevo-api" | "smtp" | "none";

let emailVerified = false;
let activeTransport: EmailTransport = "none";

/** True when Brevo HTTP API key is set (preferred on Render — SMTP ports are often blocked). */
export function usesBrevoApi(): boolean {
  return Boolean(env.brevoApiKey);
}

/** True when pointing at a real SMTP provider (not local Mailpit). */
export function isSmtpConfigured(): boolean {
  const { host, user, pass } = env.smtp;
  if (!host || host === "localhost" || host === "127.0.0.1") return false;
  return Boolean(user && pass);
}

export function isEmailConfigured(): boolean {
  return usesBrevoApi() || isSmtpConfigured();
}

export function getEmailTransport(): EmailTransport {
  return activeTransport;
}

export function isEmailVerified(): boolean {
  return emailVerified;
}

/** @deprecated Use isEmailVerified */
export function isSmtpVerified(): boolean {
  return emailVerified;
}

function buildTransportOptions() {
  const port = env.smtp.port;
  const secure = port === 465 ? true : port === 587 ? false : env.smtp.secure;

  return {
    host: env.smtp.host,
    port,
    secure,
    requireTLS: port === 587,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };
}

const transporter: Transporter = nodemailer.createTransport(buildTransportOptions());

function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: "GiftCard4Sale", email: from.trim() };
}

function formatSubject(subject: string): string {
  return subject.startsWith("[GiftCard4Sale]") ? subject : `[GiftCard4Sale] ${subject}`;
}

async function verifyBrevoApi(): Promise<boolean> {
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": env.brevoApiKey, accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Brevo API verify failed:", res.status, body.slice(0, 200));
      return false;
    }
    activeTransport = "brevo-api";
    emailVerified = true;
    console.log("[email] Brevo API ready (HTTPS — works on Render where SMTP is blocked)");
    return true;
  } catch (err) {
    console.error("[email] Brevo API verify failed:", (err as Error).message);
    return false;
  }
}

async function verifySmtp(): Promise<boolean> {
  if (!isSmtpConfigured()) return false;
  try {
    await transporter.verify();
    activeTransport = "smtp";
    emailVerified = true;
    console.log(`[email] SMTP ready (${env.smtp.host}:${env.smtp.port})`);
    return true;
  } catch (err) {
    const e = err as Error & { code?: string; response?: string };
    console.error(
      "[email] SMTP verify failed:",
      e.message,
      e.code ? `(${e.code})` : "",
      e.response ? `— ${e.response}` : ""
    );
    if (env.isProd && e.code === "ETIMEDOUT") {
      console.error(
        "[email] Render often blocks outbound SMTP. Set BREVO_API_KEY (Brevo → SMTP & API → API keys) instead."
      );
    }
    return false;
  }
}

/** Call once at startup to surface email misconfiguration early. */
export async function verifyEmailConnection(): Promise<boolean> {
  emailVerified = false;
  activeTransport = "none";

  if (!isEmailConfigured()) {
    console.warn("[email] Not configured — set BREVO_API_KEY (production) or SMTP_* (local).");
    return false;
  }

  if (usesBrevoApi()) {
    const ok = await verifyBrevoApi();
    if (ok || !isSmtpConfigured()) return ok;
    console.warn("[email] Brevo API failed; trying SMTP fallback…");
  }

  return verifySmtp();
}

/** @deprecated Use verifyEmailConnection */
export async function verifySmtpConnection(): Promise<boolean> {
  return verifyEmailConnection();
}

async function sendViaBrevoApi(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const sender = parseFrom(env.smtp.from);
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject: formatSubject(subject),
        htmlContent: html,
        textContent: text,
        headers: { "X-Entity-Ref-ID": "giftcard4sale-transactional" },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Brevo API failed → ${to}:`, res.status, body.slice(0, 300));
      return false;
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    if (env.isProd) {
      console.log(`[email] sent (brevo-api) → ${to}: ${data.messageId || "ok"}`);
    }
    return true;
  } catch (err) {
    console.error(`[email] Brevo API failed → ${to}:`, (err as Error).message);
    return false;
  }
}

async function sendViaSmtp(to: string, subject: string, html: string, text: string): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: formatSubject(subject),
      html,
      text,
      headers: {
        "X-Entity-Ref-ID": "giftcard4sale-transactional",
        Precedence: "auto",
      },
    });
    if (env.isProd) {
      console.log(`[email] sent (smtp) → ${to}: ${info.messageId || "ok"}`);
    }
    return true;
  } catch (err) {
    const e = err as Error & { code?: string; response?: string; responseCode?: number };
    console.error(
      `[email] SMTP failed → ${to}:`,
      e.message,
      e.code ? `(${e.code})` : "",
      e.responseCode ? `[${e.responseCode}]` : "",
      e.response ? `— ${e.response}` : ""
    );
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface TransactionalEmailContent {
  title: string;
  preheader?: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaHref?: string;
  /** Shown below the main content for account/security messages. */
  securityNote?: string;
}

/** Build HTML + plain-text bodies for a transactional email. */
export function buildTransactionalEmail(content: TransactionalEmailContent): { html: string; text: string } {
  const preheader = content.preheader || content.paragraphs[0]?.slice(0, 140) || content.title;
  const bodyHtml = content.paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join("");
  const cta =
    content.ctaLabel && content.ctaHref
      ? `<p style="margin:24px 0 0">${button(content.ctaLabel, content.ctaHref)}</p>`
      : "";
  const security = content.securityNote
    ? `<p style="margin:20px 0 0;padding:12px 14px;background:#f8fafc;border-radius:8px;color:#475569;font-size:13px">${escapeHtml(content.securityNote)}</p>`
    : "";

  const html = layout(content.title, preheader, `${bodyHtml}${cta}${security}`);
  const textParts = [
    content.title,
    "",
    ...content.paragraphs,
    content.ctaLabel && content.ctaHref ? `\n${content.ctaLabel}: ${content.ctaHref}` : "",
    content.securityNote ? `\n\n${content.securityNote}` : "",
    "",
    `— GiftCard4Sale (${env.webUrl})`,
    `Support: ${env.supportEmail}`,
    `Privacy: ${env.webUrl}/privacy`,
    `Terms: ${env.webUrl}/terms`,
  ].filter(Boolean);

  return { html, text: textParts.join("\n") };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.error(`[email] skipped (not configured) → ${to}: ${subject}`);
    return false;
  }

  const plain = text ?? stripHtml(html);

  if (usesBrevoApi()) {
    const ok = await sendViaBrevoApi(to, subject, html, plain);
    if (ok || !isSmtpConfigured()) return ok;
  }

  if (isSmtpConfigured()) {
    return sendViaSmtp(to, subject, html, plain);
  }

  return false;
}

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  content: TransactionalEmailContent
): Promise<boolean> {
  const { html, text } = buildTransactionalEmail(content);
  return sendEmail(to, subject, html, text);
}

export function layout(title: string, preheader: string, inner: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#0f766e;color:#fff;padding:20px 24px;font-size:20px;font-weight:bold">GiftCard4Sale</div>
      <div style="padding:24px;color:#0f172a;line-height:1.6;font-size:15px">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0f172a">${escapeHtml(title)}</h1>
        ${inner}
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6">
        <p style="margin:0 0 8px">This is a transactional email about your GiftCard4Sale account or activity. You received it because you have an account at <a href="${env.webUrl}" style="color:#0f766e">${env.webUrl.replace(/^https?:\/\//, "")}</a>.</p>
        <p style="margin:0 0 8px">Questions? Contact <a href="mailto:${env.supportEmail}" style="color:#0f766e">${env.supportEmail}</a></p>
        <p style="margin:0">
          <a href="${env.webUrl}/privacy" style="color:#64748b">Privacy Policy</a> ·
          <a href="${env.webUrl}/terms" style="color:#64748b">Terms of Service</a>
        </p>
        <p style="margin:8px 0 0">© ${year} GiftCard4Sale. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${escapeHtml(label)}</a>`;
}

/** @deprecated Prefer sendTransactionalEmail / buildTransactionalEmail */
export function legacyLayout(title: string, inner: string): string {
  return layout(title, title, inner);
}
