import { env } from "../env";
import { escapeHtml, sendEmail } from "./email";

/**
 * Illustrated "install the app + choose your notifications" email. Sent to every
 * user once their email is verified, and used by scripts/email-app-install-guide.ts
 * for the broadcast. Illustrations live in apps/web/public/email/app-guide/
 * (regenerate with the script's --export-assets flag).
 */

export const APP_GUIDE_SUBJECT = "Get instant trade alerts: install GiftCard4Sale on your phone";
export const APP_GUIDE_IMAGES = ["hero", "android", "ios", "notifications"] as const;
export type AppGuideImage = (typeof APP_GUIDE_IMAGES)[number] | "logo";

const TEAL = "#0f766e";
const INK = "#0f172a";
const MUTED = "#64748b";

export interface AppGuideEmailOptions {
  name?: string | null;
  siteUrl?: string;
  /** Image src for each illustration; defaults to the images hosted on the website. */
  imageSrc?: (image: AppGuideImage) => string;
}

const btn = (label: string, href: string, primary = true) =>
  `<a href="${href}" style="display:inline-block;background:${primary ? TEAL : "#ffffff"};color:${primary ? "#ffffff" : TEAL};border:2px solid ${TEAL};text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:bold;font-size:15px;margin:6px 4px">${escapeHtml(label)}</a>`;

const sectionHeader = (kicker: string, title: string, color: string) => `
  <tr><td style="padding:36px 32px 6px">
    <div style="display:inline-block;background:${color};color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1.2px;padding:5px 12px;border-radius:999px">${kicker}</div>
    <h2 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:${INK}">${title}</h2>
  </td></tr>`;

const stepCaptions = (steps: [string, string][]) => `
  <tr><td style="padding:0 24px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      ${steps
        .map(
          ([title, body], i) => `<td width="33%" valign="top" style="padding:0 8px;font-size:13px;line-height:1.5;color:#334155">
          <div style="font-weight:bold;color:${TEAL};font-size:14px;margin-bottom:2px">${i + 1}. ${title}</div>${body}</td>`
        )
        .join("")}
    </tr></table>
  </td></tr>`;

const image = (src: string, alt: string) => `
  <tr><td style="padding:16px 24px 14px">
    <img src="${src}" width="552" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:18px">
  </td></tr>`;

const note = (html: string, bg = "#f0fdfa", border = "#99f6e4") => `
  <tr><td style="padding:16px 32px 0">
    <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:12px 16px;font-size:13px;line-height:1.55;color:#134e4a">${html}</div>
  </td></tr>`;

export function buildAppGuideEmail(options: AppGuideEmailOptions = {}): { html: string; text: string } {
  const site = (options.siteUrl || env.webUrl).replace(/\/$/, "");
  const src =
    options.imageSrc ??
    ((img: AppGuideImage) => (img === "logo" ? `${site}/icon-192.png` : `${site}/email/app-guide/${img}.png`));
  const name = (options.name || "").trim();
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  const profileUrl = `${site}/dashboard/profile`;
  const year = new Date().getFullYear();
  const prefRows: [string, string][] = [
    ["Trade updates", "Status changes, approvals and payouts"],
    ["Trade chat", "New messages on your trade (max one alert per 15 min per trade)"],
    ["Withdrawals", "Withdrawal requests and payouts"],
    ["Referrals", "Referral bonus earnings"],
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(APP_GUIDE_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#e2f3f1">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Install GiftCard4Sale on your phone in 3 taps and get instant alerts when your trade is approved, paid or replied to.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e2f3f1">
  <tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;box-shadow:0 10px 30px rgba(15,118,110,0.15)">

    <tr><td style="padding:20px 28px;background:${TEAL}">
      <table role="presentation" cellspacing="0" cellpadding="0"><tr>
        <td><img src="${src("logo")}" width="36" height="36" alt="" style="display:block;border-radius:9px"></td>
        <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:bold">GiftCard4Sale</td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:24px 24px 0">
      <img src="${src("hero")}" width="552" alt="Never miss a trade update. Install GiftCard4Sale on your phone." style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:18px">
    </td></tr>

    <tr><td style="padding:28px 32px 0;color:${INK};font-size:15px;line-height:1.65">
      <p style="margin:0 0 14px;font-size:17px;font-weight:bold">${greeting}</p>
      <p style="margin:0 0 14px">You can now install <strong>GiftCard4Sale as an app</strong> on your phone, straight from your browser. There's no app store and nothing big to download. It takes about 10 seconds.</p>
      <p style="margin:0">Once it's installed, you'll get <strong>instant push notifications</strong> when your trade is approved or paid, when a withdrawal goes through, or when support replies on your trade, even when the app is closed.</p>
    </td></tr>

    ${sectionHeader("ANDROID \u00B7 CHROME", "Install on Android", "#16a34a")}
    ${image(src("android"), "Android: tap the three-dot menu, tap Install app, then tap Install.")}
    ${stepCaptions([
      ["Open the menu", `Visit <a href="${site}" style="color:${TEAL}">giftcard4sale.com</a> in <strong>Chrome</strong> and tap the <strong>\u22EE</strong> menu (top right).`],
      ["Tap Install app", `Choose <strong>Install app</strong> (on some phones it says <strong>Add to Home screen</strong>).`],
      ["Confirm", `Tap <strong>Install</strong>. The GiftCard4Sale icon now sits on your home screen.`],
    ])}

    ${sectionHeader("IPHONE &amp; IPAD \u00B7 SAFARI", "Install on iPhone", "#2563eb")}
    ${image(src("ios"), "iPhone: tap Share in Safari, tap Add to Home Screen, then tap Add.")}
    ${stepCaptions([
      ["Tap Share", `Open <a href="${site}" style="color:${TEAL}">giftcard4sale.com</a> in <strong>Safari</strong> and tap the <strong>Share</strong> button. On newer iOS, tap <strong>\u2022\u2022\u2022</strong> first.`],
      ["Add to Home Screen", `Scroll down and tap <strong>Add to Home Screen</strong>.`],
      ["Tap Add", `Leave <strong>Open as Web App</strong> on and tap <strong>Add</strong> (top right).`],
    ])}
    ${note(
      `<strong>iPhone tip:</strong> push notifications need iOS 16.4 or later, and you have to open GiftCard4Sale from the <strong>home-screen icon</strong>, not from Safari, for alerts to work.`,
      "#eff6ff",
      "#bfdbfe"
    )}

    ${sectionHeader("YOUR DASHBOARD", "Turn on alerts and pick what you get", "#d97706")}
    ${image(src("notifications"), "Allow notifications, open Dashboard then Profile, and choose your notification types.")}
    ${stepCaptions([
      ["Allow alerts", `Open the app, log in and tap <strong>Allow</strong> when asked to send notifications.`],
      ["Go to Profile", `Open <strong>Dashboard</strong> and tap <strong>Profile</strong>, then scroll to <strong>Notifications</strong>.`],
      ["Choose and save", `Tick <strong>In-app</strong>, <strong>Push</strong> or <strong>Email</strong> for each type, then tap <strong>Save</strong>.`],
    ])}

    <tr><td style="padding:22px 32px 0">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:14px;border-collapse:separate;overflow:hidden">
        <tr style="background:#f8fafc">
          <td style="padding:10px 14px;font-size:12px;font-weight:bold;color:${MUTED};letter-spacing:0.8px">NOTIFICATION TYPE</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:bold;color:${MUTED};letter-spacing:0.8px" align="right">CHANNELS</td>
        </tr>
        ${prefRows
          .map(
            ([label, hint]) => `<tr>
          <td style="padding:12px 14px;border-top:1px solid #e2e8f0;font-size:14px;color:${INK}"><strong>${label}</strong><br><span style="font-size:12px;color:${MUTED}">${hint}</span></td>
          <td style="padding:12px 14px;border-top:1px solid #e2e8f0;font-size:11px;white-space:nowrap" align="right">
            <span style="display:inline-block;background:#f0fdfa;color:${TEAL};border-radius:999px;padding:3px 8px;font-weight:bold">In-app</span>
            <span style="display:inline-block;background:#f0fdfa;color:${TEAL};border-radius:999px;padding:3px 8px;font-weight:bold">Push</span>
            <span style="display:inline-block;background:#f0fdfa;color:${TEAL};border-radius:999px;padding:3px 8px;font-weight:bold">Email</span>
          </td></tr>`
          )
          .join("")}
      </table>
    </td></tr>
    ${note(
      `Everything is <strong>on by default</strong>. Use the <strong>Push on this device</strong> switch at the top of the Notifications section to turn push alerts on or off for the phone you're using.`
    )}

    <tr><td align="center" style="padding:30px 24px 8px">
      ${btn("Open GiftCard4Sale", site)}
      ${btn("Set my notifications", profileUrl, false)}
    </td></tr>
    <tr><td align="center" style="padding:6px 32px 32px;font-size:13px;color:${MUTED};line-height:1.6">
      Need help installing? Just reply to <a href="mailto:${env.supportEmail}" style="color:${TEAL}">${env.supportEmail}</a> and we'll walk you through it.
    </td></tr>

    <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:${MUTED};font-size:12px;line-height:1.6">
      <p style="margin:0 0 8px">You're receiving this service update because you have a GiftCard4Sale account at <a href="${site}" style="color:${TEAL}">${site.replace(/^https?:\/\//, "")}</a>. You can choose which emails you get under <a href="${profileUrl}" style="color:${TEAL}">Dashboard \u2192 Profile \u2192 Notifications</a>.</p>
      <p style="margin:0"><a href="${site}/privacy" style="color:${MUTED}">Privacy Policy</a> \u00B7 <a href="${site}/terms" style="color:${MUTED}">Terms of Service</a> \u00B7 \u00A9 ${year} GiftCard4Sale</p>
    </td></tr>

  </table>
  </td></tr>
  </table>
</body>
</html>`;

  const text = [
    name ? `Hi ${name},` : "Hi there,",
    "",
    "You can now install GiftCard4Sale as an app on your phone, straight from your browser. No app store needed. Once it's installed you get instant push notifications for trade approvals, payouts, withdrawals and replies.",
    "",
    "ANDROID (Chrome)",
    `1. Open ${site} in Chrome and tap the three-dot menu (top right).`,
    "2. Tap 'Install app' (or 'Add to Home screen').",
    "3. Tap 'Install'.",
    "",
    "IPHONE / IPAD (Safari)",
    `1. Open ${site} in Safari and tap the Share button (on newer iOS, tap \u2022\u2022\u2022 first).`,
    "2. Tap 'Add to Home Screen'.",
    "3. Leave 'Open as Web App' on and tap 'Add'.",
    "Tip: iPhone push alerts need iOS 16.4+ and only work when you open the app from the home-screen icon.",
    "",
    "CHOOSE YOUR NOTIFICATIONS",
    "1. Open the app, log in and tap 'Allow' when asked about notifications.",
    "2. Go to Dashboard > Profile > Notifications.",
    "3. For Trade updates, Trade chat, Withdrawals and Referrals, tick In-app, Push or Email, then tap 'Save notification preferences'.",
    "",
    `Set my notifications: ${profileUrl}`,
    "",
    `Need help? ${env.supportEmail}`,
    `GiftCard4Sale (${site})`,
  ].join("\n");

  return { html, text };
}

/** Send the guide to a newly verified user (images served from the website). */
export async function sendAppInstallGuideEmail(user: { email: string; displayName?: string | null }): Promise<boolean> {
  const { html, text } = buildAppGuideEmail({ name: user.displayName });
  return sendEmail(user.email, APP_GUIDE_SUBJECT, html, text);
}
