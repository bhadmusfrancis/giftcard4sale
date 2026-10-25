/**
 * Illustrated broadcast: install GiftCard4Sale as an app (PWA) for instant
 * trade notifications, and choose notification types from the dashboard.
 *
 * Illustrations are rendered from SVG to PNG and embedded inline (CID), so
 * nothing has to be deployed for the images to show. The email template lives in
 * src/services/appInstallGuideEmail.ts, which also sends it automatically when a user verifies
 * their email (using the hosted copies in apps/web/public/email/app-guide/).
 *
 * Regenerate the hosted copies after changing the illustrations:
 *   npx tsx --import ./scripts/cli-preload.ts scripts/email-app-install-guide.ts --export-assets
 *
 * Usage (from apps/api):
 *   npx tsx --import ./scripts/cli-preload.ts scripts/email-app-install-guide.ts            # preview + recipient count
 *   npx tsx --import ./scripts/cli-preload.ts scripts/email-app-install-guide.ts --test me@example.com
 *   npx tsx --import ./scripts/cli-preload.ts scripts/email-app-install-guide.ts --send     # all active users
 *
 * Flags: --include-unverified (also email users who never verified), --limit N, --pause SECONDS
 * Sends via Zoho when ZOHO_EMAIL + ZOHO_APP_PASSWORD are set (ZOHO_SMTP_HOST, ZOHO_SMTP_PORT,
 * ZOHO_FROM_NAME optional; defaults smtppro.zoho.com:465), else the app's SMTP_* settings.
 * Pacing: 2 min between sends, 10 min backoff on Zoho "unusual activity", stop after 2 rate-limited attempts.
 * Already-emailed addresses are recorded in reports/app-install-email/sent.txt and skipped on re-runs.
 */
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import sharp from "sharp";
import { env } from "../src/env";
import { prisma } from "../src/prisma";
import { APP_GUIDE_IMAGES, APP_GUIDE_SUBJECT, buildAppGuideEmail } from "../src/services/appInstallGuideEmail";

const SITE = (process.env.EMAIL_SITE_URL || "https://www.giftcard4sale.com").replace(/\/$/, "");
const OUT_DIR = path.resolve(__dirname, "../../../reports/app-install-email");
const PUBLIC_ASSETS_DIR = path.resolve(__dirname, "../../web/public/email/app-guide");
const SENT_LOG = path.join(OUT_DIR, "sent.txt");
// Same pacing as the Zoho send queues in Desktop/Websites/job-applications (send_queue_lmia_batch3.py):
// 2 min between sends (Zoho flagged bursts before), 10 min backoff on "unusual activity", 2 attempts.
const DELAY_OK_MS = 120_000;
const DELAY_RATE_LIMIT_MS = 10 * 60_000;
const MAX_ATTEMPTS = 2;

const args = process.argv.slice(2);
const argValue = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const TEST_TO = argValue("--test");
const SEND_ALL = args.includes("--send");
const INCLUDE_UNVERIFIED = args.includes("--include-unverified");
const LIMIT = argValue("--limit") ? Number(argValue("--limit")) : undefined;

// ---------------------------------------------------------------------------
// Illustrations
// ---------------------------------------------------------------------------

const TEAL = "#0f766e";
const TEAL_DARK = "#115e59";
const TEAL_LIGHT = "#0d9488";
const AMBER = "#f59e0b";
const INK = "#0f172a";
const MUTED = "#64748b";
const FONT = "Arial, Helvetica, sans-serif";

const W = 1080;
const H = 700;
const PW = 300;
const PH = 600;
const SW = PW - 24;
const SH = PH - 24;
const PHONE_X = [45, 390, 735];
const PHONE_Y = 80;

const t = (x: number, y: number, s: string, size = 14, fill = INK, weight = "normal", anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;

const r = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;

/** Amber "tap here" rings. */
const tapRing = (cx: number, cy: number, rad = 20) =>
  `<circle cx="${cx}" cy="${cy}" r="${rad + 10}" fill="${AMBER}" opacity="0.15"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${AMBER}" fill-opacity="0.18" stroke="${AMBER}" stroke-width="4"/>`;

const tapBox = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="14" fill="${AMBER}" opacity="0.15"/>` +
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${AMBER}" fill-opacity="0.16" stroke="${AMBER}" stroke-width="4"/>`;

const appIcon = (x: number, y: number, size: number) => {
  const s = size / 512;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <rect width="512" height="512" rx="112" fill="url(#iconGrad)"/>
    <rect x="96" y="150" width="320" height="212" rx="28" fill="#fff" opacity="0.12"/>
    <rect x="96" y="150" width="320" height="56" rx="28" fill="#fff" opacity="0.18"/>
    <text x="256" y="330" font-family="${FONT}" font-size="220" font-weight="800" fill="#fff" text-anchor="middle">G</text>
  </g>`;
};

const statusBar = (dark = false) => {
  const c = dark ? "#fff" : INK;
  return (
    t(26, 30, "9:41", 14, c, "bold") +
    r(SW - 72, 20, 18, 10, c, 2) +
    r(SW - 48, 18, 26, 13, "none", 4, `stroke="${c}" stroke-width="2"`) +
    r(SW - 45, 21, 18, 7, c, 2)
  );
};

/** A tiny GiftCard4Sale homepage, used as the page behind the browser chrome. */
const sitePage = (top: number) =>
  r(0, top, SW, 44, TEAL) +
  appIcon(14, top + 9, 26) +
  t(48, top + 28, "GiftCard4Sale", 15, "#fff", "bold") +
  r(SW - 40, top + 15, 22, 3, "#fff", 1) +
  r(SW - 40, top + 21, 22, 3, "#fff", 1) +
  r(SW - 40, top + 27, 22, 3, "#fff", 1) +
  `<rect x="0" y="${top + 44}" width="${SW}" height="190" fill="url(#heroGrad)"/>` +
  t(18, top + 84, "Sell gift cards", 22, "#fff", "bold") +
  t(18, top + 112, "for cash in minutes", 22, "#fff", "bold") +
  t(18, top + 138, "Paid in USDT, Naira or Cedi", 13, "#ccfbf1") +
  r(18, top + 160, 130, 38, "#fff", 10) +
  t(83, top + 184, "Start a trade", 13, TEAL, "bold", "middle") +
  [0, 1, 2]
    .map((i) => {
      const y = top + 254 + i * 62;
      return (
        r(14, y, SW - 28, 50, "#f8fafc", 10, `stroke="#e2e8f0"`) +
        r(26, y + 11, 28, 28, ["#fde68a", "#bfdbfe", "#fecaca"][i], 7) +
        r(66, y + 14, 110, 8, "#cbd5e1", 4) +
        r(66, y + 29, 70, 7, "#e2e8f0", 4) +
        t(SW - 26, y + 31, ["$0.78", "$0.71", "$0.65"][i], 13, TEAL, "bold", "end")
      );
    })
    .join("");

const dim = () => r(0, 0, SW, SH, "#0f172a", 0, `opacity="0.45"`);

// --- Android -----------------------------------------------------------------

const chromeBar = () =>
  r(0, 40, SW, 50, "#fff") +
  r(12, 48, 196, 34, "#f1f5f9", 17) +
  r(26, 59, 9, 11, "none", 2, `stroke="${MUTED}" stroke-width="2"`) +
  t(44, 70, "giftcard4sale.com", 13, INK) +
  r(220, 54, 20, 20, "none", 4, `stroke="${INK}" stroke-width="2"`) +
  t(230, 69, "1", 11, INK, "bold", "middle") +
  `<circle cx="256" cy="57" r="2.6" fill="${INK}"/><circle cx="256" cy="65" r="2.6" fill="${INK}"/><circle cx="256" cy="73" r="2.6" fill="${INK}"/>`;

const android1 = () => r(0, 0, SW, SH, "#fff") + statusBar() + chromeBar() + sitePage(90) + tapRing(256, 65, 18);

const android2 = () => {
  const items = ["New tab", "New Incognito tab", "History", "Downloads", "Bookmarks", "Install app", "Settings"];
  const mx = 80;
  const my = 46;
  const mw = SW - mx - 8;
  const rows = items
    .map((label, i) => {
      const y = my + 56 + i * 44;
      const hl = label === "Install app";
      return (
        (hl ? r(mx + 6, y - 2, mw - 12, 40, "#fef3c7", 8) : "") +
        r(mx + 18, y + 11, 16, 16, "none", 3, `stroke="${hl ? TEAL : MUTED}" stroke-width="2"`) +
        t(mx + 46, y + 25, label, 14, INK, hl ? "bold" : "normal")
      );
    })
    .join("");
  const hlY = my + 56 + 5 * 44;
  return (
    r(0, 0, SW, SH, "#fff") +
    statusBar() +
    chromeBar() +
    sitePage(90) +
    dim() +
    `<rect x="${mx}" y="${my}" width="${mw}" height="${56 + items.length * 44 + 8}" rx="12" fill="#fff" filter="url(#shadow)"/>` +
    ["M", "S", "D", "i", "R"]
      .map((_, i) => `<circle cx="${mx + 22 + i * 34}" cy="${my + 26}" r="9" fill="none" stroke="${MUTED}" stroke-width="2"/>`)
      .join("") +
    r(mx, my + 50, mw, 1, "#e2e8f0") +
    rows +
    tapBox(mx + 6, hlY - 2, mw - 12, 40)
  );
};

const android3 = () => {
  const dy = 170;
  return (
    r(0, 0, SW, SH, "#fff") +
    statusBar() +
    chromeBar() +
    sitePage(90) +
    dim() +
    `<rect x="18" y="${dy}" width="${SW - 36}" height="236" rx="22" fill="#fff" filter="url(#shadow)"/>` +
    t(40, dy + 44, "Install app", 20, INK, "bold") +
    appIcon(40, dy + 68, 56) +
    t(110, dy + 92, "GiftCard4Sale", 16, INK, "bold") +
    t(110, dy + 114, "www.giftcard4sale.com", 12, MUTED) +
    t(40, dy + 158, "Opens like an app, with alerts.", 12, MUTED) +
    t(SW - 152, dy + 208, "Cancel", 15, TEAL, "bold", "middle") +
    r(SW - 116, dy + 184, 82, 38, TEAL, 19) +
    t(SW - 75, dy + 208, "Install", 15, "#fff", "bold", "middle") +
    tapBox(SW - 116, dy + 184, 82, 38)
  );
};

// --- iOS ---------------------------------------------------------------------

const shareIcon = (cx: number, cy: number, c = "#007aff") =>
  `<rect x="${cx - 9}" y="${cy - 4}" width="18" height="18" rx="3" fill="none" stroke="${c}" stroke-width="2.2"/>` +
  r(cx - 3, cy - 6, 6, 4, "#fff") +
  `<path d="M${cx} ${cy + 6} V${cy - 14} M${cx - 6} ${cy - 8} L${cx} ${cy - 14} L${cx + 6} ${cy - 8}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

const safariChrome = () => {
  const y = SH - 112;
  return (
    r(0, y, SW, 112, "#f8fafc") +
    r(0, y, SW, 1, "#e2e8f0") +
    r(14, y + 10, SW - 28, 38, "#fff", 12, `stroke="#e2e8f0"`) +
    t(SW / 2, y + 34, "giftcard4sale.com", 14, INK, "normal", "middle") +
    `<path d="M34 ${y + 66} l-9 9 l9 9" fill="none" stroke="#007aff" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M80 ${y + 66} l9 9 l-9 9" fill="none" stroke="#94a3b8" stroke-width="2.6" stroke-linecap="round"/>` +
    shareIcon(SW / 2, y + 78) +
    `<path d="M186 ${y + 66} v18 q10 -4 18 0 v-18 q-8 -4 -18 0 z" fill="none" stroke="#007aff" stroke-width="2.2"/>` +
    r(232, y + 66, 18, 18, "none", 3, `stroke="#007aff" stroke-width="2.2"`)
  );
};

const ios1 = () =>
  r(0, 0, SW, SH, "#fff") + statusBar() + sitePage(40) + safariChrome() + tapRing(SW / 2, SH - 112 + 76, 20);

const ios2 = () => {
  const sy = 150;
  const list = ["Copy", "Add to Reading List", "Add Bookmark", "Add to Favourites", "Add to Home Screen"];
  const rows = list
    .map((label, i) => {
      const y = sy + 168 + i * 46;
      const hl = label === "Add to Home Screen";
      return (
        (i > 0 ? r(28, y, SW - 56, 1, "#e5e7eb") : "") +
        t(32, y + 29, label, 14, INK, hl ? "bold" : "normal") +
        (hl
          ? r(SW - 50, y + 13, 20, 20, "none", 5, `stroke="${INK}" stroke-width="2"`) +
            `<path d="M${SW - 40} ${y + 17} v12 M${SW - 46} ${y + 23} h12" stroke="${INK}" stroke-width="2"/>`
          : r(SW - 48, y + 15, 16, 16, "none", 4, `stroke="${MUTED}" stroke-width="2"`))
      );
    })
    .join("");
  const hlY = sy + 168 + 4 * 46;
  return (
    r(0, 0, SW, SH, "#fff") +
    statusBar() +
    sitePage(40) +
    dim() +
    `<rect x="0" y="${sy}" width="${SW}" height="${SH - sy + 30}" rx="22" fill="#f2f2f7"/>` +
    appIcon(18, sy + 18, 44) +
    t(72, sy + 38, "GiftCard4Sale", 15, INK, "bold") +
    t(72, sy + 56, "giftcard4sale.com", 12, MUTED) +
    ["#3b82f6", "#22c55e", "#0ea5e9", "#16a34a"]
      .map((c, i) => `<circle cx="${42 + i * 64}" cy="${sy + 106}" r="22" fill="${c}"/>`)
      .join("") +
    ["AirDrop", "Messages", "Mail", "WhatsApp"]
      .map((l, i) => t(42 + i * 64, sy + 146, l, 10, MUTED, "normal", "middle"))
      .join("") +
    r(16, sy + 160, SW - 32, list.length * 46 + 14, "#fff", 14) +
    rows +
    tapBox(20, hlY + 4, SW - 40, 40)
  );
};

const ios3 = () =>
  r(0, 0, SW, SH, "#f2f2f7") +
  statusBar() +
  t(14, 76, "Cancel", 14, "#007aff") +
  t(SW / 2 - 4, 76, "Add to Home Screen", 12.5, INK, "bold", "middle") +
  t(SW - 20, 76, "Add", 15, "#007aff", "bold", "end") +
  tapRing(SW - 34, 71, 22) +
  r(16, 104, SW - 32, 96, "#fff", 14) +
  appIcon(30, 120, 64) +
  t(108, 146, "GiftCard4Sale", 15, INK, "bold") +
  r(108, 156, SW - 140, 1, "#e5e7eb") +
  t(108, 178, "giftcard4sale.com", 12, MUTED) +
  r(16, 216, SW - 32, 50, "#fff", 14) +
  t(30, 247, "Open as Web App", 14, INK) +
  r(SW - 82, 228, 50, 28, "#34c759", 14) +
  `<circle cx="${SW - 46}" cy="242" r="12" fill="#fff"/>` +
  t(SW / 2, 300, "An icon will be added to your", 12, MUTED, "normal", "middle") +
  t(SW / 2, 318, "Home Screen so you can open", 12, MUTED, "normal", "middle") +
  t(SW / 2, 336, "GiftCard4Sale like an app.", 12, MUTED, "normal", "middle") +
  ["#fde68a", "#c7d2fe", "#bbf7d0", "#fecaca", "#bae6fd", "#ddd6fe", "#fed7aa"]
    .map((c, i) => r(30 + (i % 4) * 58, 380 + Math.floor(i / 4) * 70, 44, 44, c, 11))
    .join("") +
  appIcon(30 + 3 * 58, 380 + 70, 44) +
  t(30 + 3 * 58 + 22, 380 + 70 + 60, "GiftCard4Sale", 9, INK, "normal", "middle");

// --- Notifications -----------------------------------------------------------

const appHeader = () =>
  r(0, 0, SW, 96, TEAL) + statusBar(true) + appIcon(16, 50, 30) + t(54, 72, "GiftCard4Sale", 16, "#fff", "bold") +
  `<circle cx="${SW - 30}" cy="65" r="14" fill="#ccfbf1"/>` + t(SW - 30, 70, "A", 13, TEAL, "bold", "middle");

const dashboardBody = () =>
  r(0, 96, SW, SH - 96, "#f1f5f9") +
  t(16, 132, "Welcome back", 18, INK, "bold") +
  r(16, 148, SW - 32, 92, "#fff", 14, `stroke="#e2e8f0"`) +
  t(30, 174, "Wallet balance", 12, MUTED) +
  t(30, 206, "$248.50", 26, INK, "bold") +
  t(30, 226, "USDT", 11, MUTED) +
  [0, 1, 2]
    .map(
      (i) =>
        r(16, 256 + i * 64, SW - 32, 52, "#fff", 12, `stroke="#e2e8f0"`) +
        r(30, 270 + i * 64, 24, 24, ["#fde68a", "#bfdbfe", "#bbf7d0"][i], 6) +
        r(66, 272 + i * 64, 100, 8, "#cbd5e1", 4) +
        r(66, 286 + i * 64, 60, 7, "#e2e8f0", 4) +
        r(SW - 92, 274 + i * 64, 62, 18, ["#fef3c7", "#e0f2fe", "#dcfce7"][i], 9) +
        t(SW - 61, 287 + i * 64, ["Pending", "Approved", "Paid"][i], 10, ["#92400e", "#075985", "#166534"][i], "bold", "middle")
    )
    .join("");

const notif1 = () => {
  const ay = 190;
  return (
    appHeader() +
    dashboardBody() +
    dim() +
    `<rect x="26" y="${ay}" width="${SW - 52}" height="200" rx="18" fill="#f8fafc" filter="url(#shadow)"/>` +
    t(SW / 2, ay + 38, "\u201CGiftCard4Sale\u201D Would Like", 14, INK, "bold", "middle") +
    t(SW / 2, ay + 58, "to Send You Notifications", 14, INK, "bold", "middle") +
    t(SW / 2, ay + 86, "Alerts may include sounds and", 12, MUTED, "normal", "middle") +
    t(SW / 2, ay + 104, "icon badges.", 12, MUTED, "normal", "middle") +
    r(26, ay + 140, SW - 52, 1, "#e2e8f0") +
    r(SW / 2, ay + 140, 1, 60, "#e2e8f0") +
    t(26 + (SW - 52) / 4, ay + 176, "Don\u2019t Allow", 15, "#007aff", "normal", "middle") +
    t(SW / 2 + (SW - 52) / 4, ay + 176, "Allow", 15, "#007aff", "bold", "middle") +
    tapBox(SW / 2 + 10, ay + 150, (SW - 52) / 2 - 20, 40)
  );
};

const notif2 = () => {
  const nav = ["Overview", "My trades", "Wallet", "Referrals", "Notifications", "Profile"];
  const top = 112;
  const rows = nav
    .map((label, i) => {
      const y = top + 52 + i * 44;
      const hl = label === "Profile";
      return (
        r(16, y, SW - 32, 1, "#e2e8f0") +
        (hl ? r(16, y + 1, SW - 32, 43, "#f0fdfa") : "") +
        t(32, y + 28, label, 14, hl ? TEAL : INK, hl ? "bold" : "normal")
      );
    })
    .join("");
  const hlY = top + 52 + 5 * 44;
  return (
    appHeader() +
    r(0, 96, SW, SH - 96, "#f1f5f9") +
    r(16, top, SW - 32, 52 + nav.length * 44, "#fff", 14, `stroke="#e2e8f0"`) +
    t(32, top + 32, "Dashboard", 16, INK, "bold") +
    `<path d="M${SW - 44} ${top + 22} l8 8 l8 -8" fill="none" stroke="${MUTED}" stroke-width="2.4" stroke-linecap="round"/>` +
    rows +
    tapBox(22, hlY + 4, SW - 44, 36) +
    t(16, top + 52 + nav.length * 44 + 40, "Profile", 18, INK, "bold") +
    r(16, top + 52 + nav.length * 44 + 54, SW - 32, 60, "#fff", 14, `stroke="#e2e8f0"`)
  );
};

const checkbox = (x: number, y: number, on: boolean) =>
  on
    ? r(x, y, 14, 14, TEAL, 3) +
      `<path d="M${x + 3} ${y + 7} l3 3 l5 -6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : r(x, y, 14, 14, "#fff", 3, `stroke="#94a3b8" stroke-width="1.5"`);

const notif3 = () => {
  const cats: [string, string, boolean[]][] = [
    ["Trade updates", "Status changes, approvals, payouts", [true, true, true]],
    ["Trade chat", "At most one alert per 15 min", [true, true, false]],
    ["Withdrawals", "Withdrawal requests and payouts", [true, true, true]],
    ["Referrals", "Referral bonus earnings", [true, false, true]],
  ];
  const top = 108;
  const rows = cats
    .map(([label, hint, ch], i) => {
      const y = top + 136 + i * 70;
      return (
        r(26, y, SW - 52, 64, "#fff", 10, `stroke="#e2e8f0"`) +
        t(38, y + 20, label, 13, INK, "bold") +
        t(38, y + 35, hint, 9.5, MUTED) +
        ["In-app", "Push", "Email"]
          .map((c, j) => checkbox(38 + j * 70, y + 44, ch[j]) + t(57 + j * 70, y + 56, c, 11, INK))
          .join("")
      );
    })
    .join("");
  const by = top + 136 + cats.length * 70 + 6;
  return (
    appHeader() +
    r(0, 96, SW, SH - 96, "#f1f5f9") +
    r(14, top, SW - 28, SH - top - 8, "#fff", 14, `stroke="#e2e8f0"`) +
    t(26, top + 30, "Notifications", 17, INK, "bold") +
    t(26, top + 48, "Choose how you want to be notified.", 10.5, MUTED) +
    r(26, top + 62, SW - 52, 66, "#fff", 10, `stroke="#e2e8f0"`) +
    t(38, top + 84, "Push on this device", 12.5, INK, "bold") +
    r(38, top + 96, 118, 24, "#f0fdfa", 8, `stroke="${TEAL}"`) +
    t(97, top + 112, "Push on \u00B7 Turn off", 10.5, TEAL, "bold", "middle") +
    rows +
    r(26, by, SW - 52, 32, TEAL, 9) +
    t(SW / 2, by + 21, "Save notification preferences", 12, "#fff", "bold", "middle") +
    tapBox(26, by, SW - 52, 32)
  );
};

// --- Composition -------------------------------------------------------------

const DEFS = `<defs>
  <linearGradient id="iconGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${TEAL_LIGHT}"/><stop offset="1" stop-color="${TEAL_DARK}"/></linearGradient>
  <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${TEAL_LIGHT}"/><stop offset="1" stop-color="${TEAL_DARK}"/></linearGradient>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0fdfa"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient>
  <linearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="0.55" stop-color="${TEAL}"/><stop offset="1" stop-color="#134e4a"/></linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.25"/></filter>
  <clipPath id="screen"><rect x="0" y="0" width="${SW}" height="${SH}" rx="34"/></clipPath>
</defs>`;

function phone(x: number, y: number, inner: string): string {
  return `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${PW}" height="${PH}" rx="46" fill="${INK}"/></g>
  <rect x="${x + 3}" y="${y + 3}" width="${PW - 6}" height="${PH - 6}" rx="43" fill="none" stroke="#334155" stroke-width="2"/>
  <g transform="translate(${x + 12},${y + 12})" clip-path="url(#screen)">${inner}</g>
  <rect x="${x + PW / 2 - 42}" y="${y + 22}" width="84" height="24" rx="12" fill="${INK}"/>`;
}

function stepsImage(screens: string[]): string {
  const phones = screens.map((s, i) => phone(PHONE_X[i], PHONE_Y, s)).join("");
  const badges = screens
    .map((_, i) => {
      const cx = PHONE_X[i] + PW / 2;
      return `<circle cx="${cx}" cy="40" r="26" fill="${TEAL}"/>` + t(cx, 50, String(i + 1), 28, "#fff", "bold", "middle");
    })
    .join("");
  const arrows = [0, 1]
    .map((i) => {
      const x = PHONE_X[i] + PW + 8;
      return `<path d="M${x} 380 h26 m-10 -10 l10 10 l-10 10" fill="none" stroke="${TEAL_LIGHT}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}
  <rect width="${W}" height="${H}" rx="36" fill="url(#bgGrad)"/>${badges}${arrows}${phones}</svg>`;
}

function heroImage(): string {
  const HW = 1080;
  const HH = 520;
  const lock = () => {
    const card = (y: number, title: string, body: string, ago: string) =>
      r(14, y, SW - 28, 78, "#ffffff", 18, `opacity="0.95"`) +
      appIcon(26, y + 14, 34) +
      t(70, y + 28, "GIFTCARD4SALE", 10, MUTED, "bold") +
      t(SW - 26, y + 28, ago, 10, MUTED, "normal", "end") +
      t(70, y + 47, title, 13, INK, "bold") +
      t(70, y + 65, body, 11, "#334155");
    return (
      `<rect width="${SW}" height="${SH}" fill="url(#bannerGrad)"/>` +
      `<circle cx="40" cy="520" r="160" fill="#fff" opacity="0.06"/><circle cx="260" cy="120" r="120" fill="#fff" opacity="0.06"/>` +
      statusBar(true) +
      t(SW / 2, 110, "Friday, 23 October", 14, "#ccfbf1", "normal", "middle") +
      t(SW / 2, 176, "9:41", 64, "#fff", "bold", "middle") +
      card(222, "Trade approved", "Your $100 Apple card was approved.", "now") +
      card(310, "Payout sent", "Funds credited to your wallet.", "1m ago") +
      card(398, "New message on your trade", "Support replied to your trade.", "5m ago")
    );
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HW}" height="${HH}" viewBox="0 0 ${HW} ${HH}">${DEFS}
  <rect width="${HW}" height="${HH}" rx="36" fill="url(#bannerGrad)"/>
  <circle cx="980" cy="60" r="200" fill="#fff" opacity="0.06"/>
  <circle cx="120" cy="560" r="220" fill="#fff" opacity="0.05"/>
  <circle cx="560" cy="-40" r="120" fill="#fff" opacity="0.05"/>
  ${r(64, 72, 210, 40, "#ffffff", 20, `opacity="0.16"`)}
  ${t(169, 98, "NEW \u00B7 FREE APP", 15, "#fff", "bold", "middle")}
  ${t(64, 180, "Never miss a", 54, "#fff", "bold")}
  ${t(64, 244, "trade update.", 54, "#fde68a", "bold")}
  ${t(64, 300, "Install GiftCard4Sale on your phone", 24, "#ccfbf1")}
  ${t(64, 334, "and get alerts the second your trade moves.", 24, "#ccfbf1")}
  ${[
    ["Instant push alerts", 384],
    ["No app store needed", 422],
    ["Opens in one tap", 460],
  ]
    .map(
      ([label, y]) =>
        `<circle cx="78" cy="${Number(y) - 7}" r="12" fill="#fde68a"/><path d="M72 ${Number(y) - 7} l4 4 l8 -9" fill="none" stroke="${TEAL_DARK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
        t(100, Number(y), String(label), 20, "#fff", "bold")
    )
    .join("")}
  <g transform="rotate(6 860 270)">${phone(710, -10, lock())}</g>
</svg>`;
}

async function png(svg: string, width: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 144 }).resize({ width }).png({ compressionLevel: 9 }).toBuffer();
}

interface InlineImage {
  cid: string;
  filename: string;
  content: Buffer;
}

async function buildImages(): Promise<InlineImage[]> {
  const specs: [string, string, number][] = [
    ["hero", heroImage(), 1080],
    ["android", stepsImage([android1(), android2(), android3()]), 1080],
    ["ios", stepsImage([ios1(), ios2(), ios3()]), 1080],
    ["notifications", stepsImage([notif1(), notif2(), notif3()]), 1080],
  ];
  const images: InlineImage[] = [];
  for (const [name, svg, width] of specs) {
    images.push({ cid: `${name}@giftcard4sale`, filename: `${name}.png`, content: await png(svg, width) });
  }
  const iconPath = path.resolve(__dirname, "../../web/public/icon-192.png");
  images.push({ cid: "logo@giftcard4sale", filename: "logo.png", content: fs.readFileSync(iconPath) });
  return images;
}


// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/** Zoho mailbox (ZOHO_EMAIL + ZOHO_APP_PASSWORD) when set, otherwise the app's SMTP settings. */
function mailConfig() {
  const zohoUser = process.env.ZOHO_EMAIL;
  const zohoPass = process.env.ZOHO_APP_PASSWORD;
  if (zohoUser && zohoPass) {
    return {
      label: `Zoho (${zohoUser})`,
      host: process.env.ZOHO_SMTP_HOST || "smtppro.zoho.com",
      port: Number(process.env.ZOHO_SMTP_PORT || 465),
      user: zohoUser,
      pass: zohoPass,
      // Zoho only relays mail whose From matches the authenticated mailbox.
      from: `${process.env.ZOHO_FROM_NAME || "GiftCard4Sale"} <${zohoUser}>`,
    };
  }
  return {
    label: `SMTP (${env.smtp.host})`,
    host: env.smtp.host,
    port: env.smtp.port,
    user: env.smtp.user,
    pass: env.smtp.pass,
    from: env.smtp.from,
  };
}

function transport(cfg: ReturnType<typeof mailConfig>) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.port === 587,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
}

type SendStatus = "sent" | "rate_limited" | "auth_failed" | "failed";

function classify(err: unknown): SendStatus {
  const e = err as Error & { code?: string; response?: string };
  const text = `${e.message} ${e.response ?? ""}`;
  if (/Unusual sending activity|5\.4\.6/i.test(text)) return "rate_limited";
  if (e.code === "EAUTH") return "auth_failed";
  return "failed";
}

const stamp = () => new Date().toISOString();

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const readSentLog = () =>
  new Set(
    fs.existsSync(SENT_LOG)
      ? fs.readFileSync(SENT_LOG, "utf8").split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean)
      : []
  );

const LOCK_FILE = path.join(OUT_DIR, "send.lock");

const pidAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Only one broadcast may run at a time; parallel runs would email everyone twice. */
function acquireLock(): boolean {
  if (fs.existsSync(LOCK_FILE)) {
    const pid = Number(fs.readFileSync(LOCK_FILE, "utf8").trim());
    if (pid && pidAlive(pid)) {
      console.error(`Another send is already running (pid ${pid}). Not starting a second one.`);
      return false;
    }
    fs.unlinkSync(LOCK_FILE);
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: "wx" });
  const release = () => fs.rmSync(LOCK_FILE, { force: true });
  process.on("exit", release);
  for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => process.exit(130));
  return true;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const images = await buildImages();

  for (const img of images) fs.writeFileSync(path.join(OUT_DIR, img.filename), img.content);
  const previewHtml = buildAppGuideEmail({ name: "Ada", siteUrl: SITE, imageSrc: (img) => `${img}.png` }).html;
  fs.writeFileSync(path.join(OUT_DIR, "preview.html"), previewHtml);
  console.log(`Preview written to ${path.join(OUT_DIR, "preview.html")}`);

  if (args.includes("--export-assets")) {
    fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
    for (const img of images.filter((i) => (APP_GUIDE_IMAGES as readonly string[]).includes(i.filename.replace(".png", "")))) {
      fs.writeFileSync(path.join(PUBLIC_ASSETS_DIR, img.filename), img.content);
    }
    console.log(`Hosted illustrations written to ${PUBLIC_ASSETS_DIR}`);
    return;
  }

  const where = {
    accountStatus: "ACTIVE" as const,
    ...(INCLUDE_UNVERIFIED ? {} : { emailVerified: true }),
  };
  const users = await prisma.user.findMany({
    where,
    select: { email: true, displayName: true },
    orderBy: { createdAt: "asc" },
  });
  const sent = readSentLog();
  const pending = users.filter((u) => !sent.has(u.email.toLowerCase())).slice(0, LIMIT);
  console.log(
    `Active users${INCLUDE_UNVERIFIED ? "" : " (verified email)"}: ${users.length} · already sent: ${users.length - pending.length} · to send: ${pending.length}`
  );

  if (!TEST_TO && !SEND_ALL) {
    console.log("Dry run. Use --test you@example.com to send one copy, or --send to email everyone.");
    return;
  }

  const cfg = mailConfig();
  const pauseMs = argValue("--pause") ? Number(argValue("--pause")) * 1000 : DELAY_OK_MS;
  console.log(`Sending via ${cfg.label}`);
  const mailer = transport(cfg);
  await mailer.verify();
  const attachments = images.map((i) => ({ filename: i.filename, content: i.content, cid: i.cid, contentDisposition: "inline" as const }));
  const send = (to: string, name: string) => {
    const { html, text } = buildAppGuideEmail({ name, siteUrl: SITE, imageSrc: (img) => `cid:${img}@giftcard4sale` });
    return mailer.sendMail({
      from: cfg.from,
      to,
      replyTo: env.supportEmail,
      subject: APP_GUIDE_SUBJECT,
      html,
      text,
      attachments,
      headers: { "X-Entity-Ref-ID": "giftcard4sale-app-install-guide" },
    });
  };

  if (TEST_TO) {
    await send(TEST_TO, "");
    console.log(`Test email sent to ${TEST_TO}`);
    mailer.close();
    return;
  }

  if (!acquireLock()) {
    mailer.close();
    process.exitCode = 3;
    return;
  }
  console.log(`Pacing: ${pauseMs / 1000}s between sends, ${DELAY_RATE_LIMIT_MS / 60_000} min backoff, ${MAX_ATTEMPTS} attempts.`);
  let ok = 0;
  let failed = 0;
  for (const [i, u] of pending.entries()) {
    const tag = `[${stamp()}] [${i + 1}/${pending.length}]`;
    if (readSentLog().has(u.email.toLowerCase())) {
      console.log(`${tag} skip (already in sent log) → ${u.email}`);
      continue;
    }
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let status: SendStatus = "sent";
      try {
        await send(u.email, (u.displayName || "").trim());
      } catch (err) {
        status = classify(err);
        console.error(`${tag} ${status} (attempt ${attempt}) → ${u.email}: ${(err as Error).message}`);
      }
      if (status === "sent") {
        fs.appendFileSync(SENT_LOG, `${u.email.toLowerCase()}\n`);
        ok++;
        console.log(`${tag} sent → ${u.email}`);
        break;
      }
      if (status === "auth_failed") {
        console.error("AUTH_FAILED. Check the Zoho App Password / SMTP access.");
        mailer.close();
        process.exitCode = 2;
        return;
      }
      if (status === "rate_limited" && attempt < MAX_ATTEMPTS) {
        console.error(`Rate limited. Backing off ${DELAY_RATE_LIMIT_MS / 60_000} min...`);
        await sleep(DELAY_RATE_LIMIT_MS);
        continue;
      }
      if (status === "rate_limited") {
        console.error("Still rate-limited. Open https://mail.zoho.com/UnblockMe, then re-run to resume.");
        mailer.close();
        process.exitCode = 2;
        return;
      }
      // A single bad address shouldn't halt a user broadcast; log it and move on.
      failed++;
      break;
    }
    if (i < pending.length - 1) await sleep(pauseMs);
  }
  mailer.close();
  console.log(`[${stamp()}] Done. Sent ${ok}, failed ${failed}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
