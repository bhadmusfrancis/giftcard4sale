import { Router, Request, Response } from "express";
import express from "express";
import { processNoOnesWebhook } from "../services/noones/webhooks";
import { asyncHandler } from "../lib/http";

export const noonesWebhookRouter = Router();

// Raw body required for NaCl signature verification.
noonesWebhookRouter.use(express.raw({ type: "*/*", limit: "1mb" }));

noonesWebhookRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const rawBody = (req.body as Buffer)?.toString("utf8") ?? "";

    // Webhook URL validation challenge.
    const challenge = req.headers["x-noones-request-challenge"];
    if (challenge && !rawBody.trim()) {
      res.setHeader("X-NoOnes-Request-Challenge", challenge as string);
      return res.status(200).send("");
    }

    const signature = req.headers["x-noones-signature"] as string | undefined;
    await processNoOnesWebhook(rawBody, signature);
    res.status(200).json({ ok: true });
  })
);
