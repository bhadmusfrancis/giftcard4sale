import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env";
import { UPLOAD_DIR, useS3 } from "./lib/upload";
import { apiLimiter, writeLimiter } from "./lib/rateLimit";

import { authRouter } from "./routes/auth";
import { cardsRouter } from "./routes/cards";
import { tradesRouter } from "./routes/trades";
import { meRouter } from "./routes/me";
import { withdrawalsRouter } from "./routes/withdrawals";
import { referralsRouter } from "./routes/referrals";
import { notificationsRouter } from "./routes/notifications";
import { landingRouter } from "./routes/landing";
import { adminRouter } from "./routes/admin";
import { noonesWebhookRouter } from "./routes/noonesWebhook";
import { startNoOnesJobs } from "./services/noones";
import { repairManualRateCatalog, syncNoOnesCatalogVisibilityFromStored } from "./services/cardVisibility";
import { repairCardSlugSuffixes } from "./services/cardTypeDedup";

const app = express();

// Behind a proxy/load balancer in production (correct client IPs for rate limiting).
if (env.isProd) app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// NoOnes webhooks need raw body (before JSON parser).
app.use("/webhooks/noones", noonesWebhookRouter);

// Locked-down CORS: only allow configured origins (server-to-server / curl have no origin).
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// Static uploads (only when using local disk storage).
if (!useS3) app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/health", (_req, res) => res.json({ ok: true, service: "gc4s-api" }));

// Rate limiting
app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/cards", cardsRouter);
app.use("/api/trades", writeLimiter, tradesRouter);
app.use("/api/me", meRouter);
app.use("/api/withdrawals", writeLimiter, withdrawalsRouter);
app.use("/api/referrals", referralsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/landing", landingRouter);
app.use("/api/admin", adminRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`GiftCard4Sale API listening on ${env.apiUrl} (port ${env.port})`);
  repairManualRateCatalog()
    .then((n) => {
      if (n > 0) console.log(`Reactivated ${n} manually imported rate row(s).`);
    })
    .catch((e) => console.warn("Manual rate repair:", (e as Error).message))
    .then(() => repairCardSlugSuffixes())
    .then((n) => {
      if (n > 0) console.log(`Repaired ${n} card/landing slug(s) with duplicate gift-card suffix.`);
    })
    .catch((e) => console.warn("Card slug repair:", (e as Error).message))
    .then(() => syncNoOnesCatalogVisibilityFromStored())
    .then(({ published, drafted }) => {
      if (published || drafted) {
        console.log(`NoOnes catalog visibility: ${published} published, ${drafted} drafted.`);
      }
    })
    .catch((e) => console.warn("NoOnes catalog visibility:", (e as Error).message))
    .finally(() => startNoOnesJobs());
});
