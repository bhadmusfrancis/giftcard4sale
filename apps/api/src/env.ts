import "./loadDbEnv";

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

  /** Cloudflare Turnstile CAPTCHA — enforced on /register when the secret key is set. */
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY || "",
  },

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

  /** Brevo REST API — use on Render where outbound SMTP (587) is blocked. */
  brevo: {
    apiKey: process.env.BREVO_API_KEY || "",
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
    usdtReductionPercent: num(
      process.env.USDT_REDUCTION_PERCENT ?? process.env.FX_REDUCTION_PERCENT,
      30
    ),
    ghsReductionPercent: num(
      process.env.GHS_REDUCTION_PERCENT ?? process.env.FX_REDUCTION_PERCENT,
      30
    ),
  },

  referralPercent: num(process.env.REFERRAL_PERCENT, 1),

  supportEmail: process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || "admin@giftcard4sale.com",

  admin: {
    email: process.env.ADMIN_EMAIL || "admin@giftcard4sale.com",
    password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
  },

  /** Daily gift-card insights / blog generation */
  insights: {
    enabled: (process.env.INSIGHTS_ENABLED || "true") === "true",
    cronHourUtc: num(process.env.INSIGHTS_CRON_HOUR_UTC, 8),
    cronSecret: process.env.INSIGHTS_CRON_SECRET || process.env.CRON_SECRET || "",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  /** Meta Pixel + Conversion API — CAPI no-ops until access token is set. */
  meta: {
    pixelId:
      process.env.META_PIXEL_ID ||
      process.env.NEXT_PUBLIC_META_PIXEL_ID ||
      "2231976064046353",
    capiAccessToken: process.env.META_CAPI_ACCESS_TOKEN || "",
    capiTestEventCode: process.env.META_CAPI_TEST_EVENT_CODE || "",
  },

  noones: {
    enabled: (process.env.NOONES_ENABLED || "false") === "true",
    clientId: process.env.NOONES_CLIENT_ID || process.env.NOONES_APP_ID || "",
    clientSecret: process.env.NOONES_CLIENT_SECRET || process.env.NOONES_APP_SECRET || "",
    applicationId: process.env.NOONES_APPLICATION_ID || "",
    apiBase: (process.env.NOONES_API_BASE || "https://api.noones.com/noones/v1").replace(/\/$/, ""),
    tokenUrl: process.env.NOONES_TOKEN_URL || "https://auth.noones.com/oauth2/token",
    cryptoCurrency: (process.env.NOONES_CRYPTO_CURRENCY || "USDT").toUpperCase(),
    rateSyncMinutes: num(process.env.NOONES_RATE_SYNC_MINUTES, 15),
    tradePollMinutes: num(process.env.NOONES_TRADE_POLL_MINUTES, 2),
    syncBatchSize: num(process.env.NOONES_SYNC_BATCH_SIZE, 3),
    syncBatchPauseMs: num(process.env.NOONES_SYNC_BATCH_PAUSE_MS, 3000),
    syncCardPauseMs: num(process.env.NOONES_SYNC_CARD_PAUSE_MS, 400),
    syncTargetPauseMs: num(process.env.NOONES_SYNC_TARGET_PAUSE_MS, 200),
    staleCheckPauseMs: num(process.env.NOONES_STALE_CHECK_PAUSE_MS, 50),
    staleCheckBatchSize: num(process.env.NOONES_STALE_CHECK_BATCH_SIZE, 5),
    /** Max stale cards synced per scheduled cron wake (remaining stale cards run on later wakes). */
    scheduledStaleCardsPerRun: num(process.env.NOONES_SCHEDULED_STALE_CARDS_PER_RUN, 5),
    /** When NoOnes has no separate e-code offers, ECODE rate = PHYSICAL × this factor. */
    ecodeRateFactor: num(process.env.NOONES_ECODE_RATE_FACTOR, 0.88),
    webhookPublicKey:
      process.env.NOONES_WEBHOOK_PUBLIC_KEY ||
      "fvcYFZlQl21obFbW5+RK2/foq8JzK/Y5fCEqg+NEy+k=",
    webhookUrl:
      process.env.NOONES_WEBHOOK_URL ||
      `${process.env.API_URL || "http://localhost:4000"}/webhooks/noones`,
  },
};

// Fail fast on insecure production config.
if (env.isProd) {
  const problems: string[] = [];
  if (!process.env.JWT_SECRET || env.jwtSecret === "dev-insecure-secret" || env.jwtSecret.length < 24) {
    problems.push("JWT_SECRET must be a strong random string (>= 24 chars) in production");
  }
  if (!env.databaseUrl) problems.push("DATABASE_URL is required");
  if (!env.brevo.apiKey) {
    problems.push(
      "BREVO_API_KEY is required in production (Render blocks outbound SMTP). Create one at Brevo → SMTP & API → API Keys."
    );
  }
  if (problems.length) {
    throw new Error(`Insecure/invalid production config:\n - ${problems.join("\n - ")}`);
  }
}
