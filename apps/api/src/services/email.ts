import nodemailer from "nodemailer";
import { env } from "../env";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
});

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
): Promise<void> {
  try {
    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: subject.startsWith("[GiftCard4Sale]") ? subject : `[GiftCard4Sale] ${subject}`,
      html,
      text: text ?? stripHtml(html),
      headers: {
        "X-Entity-Ref-ID": "giftcard4sale-transactional",
        Precedence: "auto",
      },
    });
  } catch (err) {
    console.error("[email] failed to send:", (err as Error).message);
  }
}

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  content: TransactionalEmailContent
): Promise<void> {
  const { html, text } = buildTransactionalEmail(content);
  await sendEmail(to, subject, html, text);
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
