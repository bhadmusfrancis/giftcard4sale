import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import {
  isBotUserAgent,
  maybePurgeOldPageViews,
  normalizePath,
  normalizeReferrer,
  parseBrowser,
} from "../services/analytics";
import { env } from "../env";

export const analyticsRouter = Router();

const collectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

const collectSchema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(1000).optional().nullable(),
  device: z.enum(["desktop", "mobile", "tablet"]).default("desktop"),
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

function siteHostFromEnv(): string | undefined {
  try {
    const host = new URL(env.webUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host && host !== "localhost") return host;
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Public beacon — records an anonymous page view.
 * Fire-and-forget from the web app; never blocks UX.
 */
analyticsRouter.post(
  "/collect",
  collectLimiter,
  asyncHandler(async (req, res) => {
    const ua = req.get("user-agent") || undefined;
    if (isBotUserAgent(ua)) {
      res.status(204).end();
      return;
    }

    const data = validate(collectSchema, req.body);
    const path = normalizePath(data.path);
    if (!path) {
      res.status(204).end();
      return;
    }

    const referrer = normalizeReferrer(data.referrer, siteHostFromEnv());
    const browser = parseBrowser(ua);

    await prisma.analyticsPageView.create({
      data: {
        path,
        referrer,
        device: data.device ?? "desktop",
        browser: browser ?? null,
        visitorId: data.visitorId,
        sessionId: data.sessionId,
      },
    });

    void maybePurgeOldPageViews().catch(() => undefined);

    res.status(204).end();
  })
);
