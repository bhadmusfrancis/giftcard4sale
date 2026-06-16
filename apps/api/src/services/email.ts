import nodemailer from "nodemailer";
import { env } from "../env";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html });
  } catch (err) {
    // Never let a mail failure break the main request flow.
    console.error("[email] failed to send:", (err as Error).message);
  }
}

export function layout(title: string, inner: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="background:#0f766e;color:#fff;padding:20px 24px;font-size:20px;font-weight:bold">GiftCard4Sale</div>
    <div style="padding:24px;color:#111;line-height:1.6">
      <h2 style="margin-top:0">${title}</h2>
      ${inner}
    </div>
    <div style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">
      You are receiving this because you have an account on GiftCard4Sale.com
    </div>
  </div>`;
}

export function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${label}</a>`;
}
