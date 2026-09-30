import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { getMediaObject, verifyMediaSignature } from "../lib/upload";

export const mediaRouter = Router();

/**
 * GET /api/media/<key>?e=<exp>&s=<sig>
 *
 * Serves private bucket/disk objects behind HMAC-signed URLs minted by
 * mediaUrl(). The signature is the capability: no session required, but the
 * link only exists inside API responses the caller was authorized to receive,
 * and expires after MEDIA_URL_TTL_SECONDS.
 */
mediaRouter.get(
  "/*",
  asyncHandler(async (req, res) => {
    const key = req.params[0] || "";
    const exp = Number(req.query.e);
    const sig = typeof req.query.s === "string" ? req.query.s : "";

    if (!verifyMediaSignature(key, exp, sig)) {
      return res.status(403).json({ error: "Invalid or expired media link" });
    }

    const obj = await getMediaObject(key);
    if (!obj) return res.status(404).json({ error: "Not found" });

    if (obj.contentType) res.setHeader("Content-Type", obj.contentType);
    if (obj.contentLength != null) res.setHeader("Content-Length", obj.contentLength);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");

    obj.body.on("error", () => {
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    obj.body.pipe(res);
  })
);
