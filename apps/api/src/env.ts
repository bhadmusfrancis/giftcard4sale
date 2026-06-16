import dotenv from "dotenv";
import path from "path";

// Load apps/api/.env first, then fall back to repo-root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function num(v: string | undefined, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function list(v: string | undefined): string[] {
  return (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  // Cloud hosts (Render/Railway/Fly) inject PORT; fall back to API_PORT for local dev.
  port: num(process.env.PORT, num(process.env.API_PORT, 4000)),
  apiUrl: process.env.API_URL || "http://localhost:4000",
  webUrl: process.env.WEB_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",

  // CORS allowlist. Defaults to WEB_URL; add more via CORS_ORIGINS (comma-separated).
  corsOrigins: (() => {
    const fromList = list(process.env.CORS_ORIGINS);
    const web = process.env.WEB_URL || "http://localhost:3000";
    return Array.from(new Set([web, ...fromList]));
  })(),

  jwtSecret: process.env.JWT_SECRET || "dev-insecure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Object storage (S3 / Cloudflare R2 / Supabase). When S3_BUCKET is set, uploads
  // go to the bucket; otherwise they fall back to local disk (dev only).
  s3: {
    bucket: process.env.S3_BUCKET || "",
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "", // set for R2/Supabase/MinIO
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    publicUrl: process.env.S3_PUBLIC_URL || "", // CDN/base URL to read objects
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || "false") === "true",
  },

  // Payout provider for withdrawals: manual | paystack | flutterwave
  payouts: {
    provider: (process.env.PAYOUT_PROVIDER || "manual").toLowerCase(),
    paystackSecret: process.env.PAYSTACK_SECRET_KEY || "",
    flutterwaveSecret: process.env.FLUTTERWAVE_SECRET_KEY || "",
  },

  smtp: {
    host: process.env.SMTP_HOST || "localhost",
    port: num(process.env.SMTP_PORT, 1025),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    secure: (process.env.SMTP_SECURE || "false") === "true",
    from: process.env.MAIL_FROM || "GiftCard4Sale <no-reply@giftcard4sale.com>",
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@giftcard4sale.com",
  },

  rates: {
    ngnPerUsdt: num(process.env.RATE_NGN_PER_USDT, 1650),
    ngnPerGhs: num(process.env.RATE_NGN_PER_GHS, 110),
  },

  reductions: {
    nairaReductionPercent: num(process.env.NAIRA_REDUCTION_PERCENT, 20),
    fxReductionPercent: num(process.env.FX_REDUCTION_PERCENT, 30),
  },

  referralPercent: num(process.env.REFERRAL_PERCENT, 1),

  admin: {
    email: process.env.ADMIN_EMAIL || "admin@giftcard4sale.com",
    password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
  },
};

// Fail fast on insecure production config.
if (env.isProd) {
  const problems: string[] = [];
  if (!process.env.JWT_SECRET || env.jwtSecret === "dev-insecure-secret" || env.jwtSecret.length < 24) {
    problems.push("JWT_SECRET must be a strong random string (>= 24 chars) in production");
  }
  if (!env.databaseUrl) problems.push("DATABASE_URL is required");
  if (problems.length) {
    throw new Error(`Insecure/invalid production config:\n - ${problems.join("\n - ")}`);
  }
}
