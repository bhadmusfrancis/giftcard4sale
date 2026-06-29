import express, { NextFunction, Request, Response, type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env";
import { UPLOAD_DIR, useS3 } from "./lib/upload";
import { apiLimiter, writeLimiter } from "./lib/rateLimit";
import { setHealthDetails } from "./health";

import { authRouter } from "./routes/auth";
import { cardsRouter } from "./routes/cards";
import { tradesRouter } from "./routes/trades";
import { meRouter } from "./routes/me";
import { withdrawalsRouter } from "./routes/withdrawals";
import { referralsRouter } from "./routes/referrals";
import { notificationsRouter } from "./routes/notifications";
import { landingRouter } from "./routes/landing";
import { insightsRouter } from "./routes/insights";
import { seoRouter } from "./routes/seo";
import { adminRouter } from "./routes/admin";
import { noonesWebhookRouter } from "./routes/noonesWebhook";
import { startNoOnesJobs } from "./services/noones";
import { startInsightsScheduler } from "./services/insights/scheduler";
import {
  ensureCardSeoLandingPagesPublished,
  repairManualRateCatalog,
  syncNoOnesCatalogVisibilityFromStored,
} from "./services/cardVisibility";
import { repairCardSlugSuffixes, repairEuroCountryLabels } from "./services/cardTypeDedup";
import { reconcilePaidTrades } from "./services/payout";
import { getEmailTransport, isEmailConfigured, isEmailVerified, verifyEmailDelivery } from "./services/email";

export function mountApi(app: Express): void {
  setHealthDetails(() => ({
    email: !isEmailConfigured() ? "missing" : isEmailVerified() ? "ready" : "configured",
    transport: getEmailTransport(),
  }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use("/webhooks/noones", noonesWebhookRouter);
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

  if (!useS3) app.use("/uploads", express.static(UPLOAD_DIR));

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRouter);
  app.use("/api/cards", cardsRouter);
  app.use("/api/trades", writeLimiter, tradesRouter);
  app.use("/api/me", meRouter);
  app.use("/api/withdrawals", writeLimiter, withdrawalsRouter);
  app.use("/api/referrals", referralsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/landing", landingRouter);
  app.use("/api/insights", insightsRouter);
  app.use("/api/seo", seoRouter);
  app.use("/api/admin", adminRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || "Internal server error" });
  });

  void verifyEmailDelivery();
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
    .then(() => repairEuroCountryLabels())
    .then((n) => {
      if (n > 0) console.log(`Renamed ${n} EUR rate row(s) from Germany to Euro.`);
    })
    .catch((e) => console.warn("Euro country repair:", (e as Error).message))
    .then(() => reconcilePaidTrades())
    .then((n) => {
      if (n > 0) console.log(`Reconciled ${n} credited trade(s) stuck off PAID (marked PAID + scored).`);
    })
    .catch((e) => console.warn("Paid trade reconciliation:", (e as Error).message))
    .then(() => syncNoOnesCatalogVisibilityFromStored())
    .then(({ published, drafted }) => {
      if (published || drafted) {
        console.log(`NoOnes catalog visibility: ${published} published, ${drafted} drafted.`);
      }
    })
    .catch((e) => console.warn("NoOnes catalog visibility:", (e as Error).message))
    .then(() => ensureCardSeoLandingPagesPublished())
    .then((n) => {
      if (n > 0) console.log(`Re-published ${n} SEO landing page(s) for inactive cards.`);
    })
    .catch((e) => console.warn("SEO landing publish:", (e as Error).message))
    .finally(() => {
      startNoOnesJobs();
      startInsightsScheduler();
    });
}
