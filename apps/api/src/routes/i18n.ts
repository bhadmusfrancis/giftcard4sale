import { Router } from "express";
import { z } from "zod";
import { asyncHandler, validate } from "../lib/http";
import { isValidLocale, normalizeLocale } from "../lib/locale";
import { translateUiStrings } from "../services/translate";

export const i18nRouter = Router();

// Public batch UI-string translation. The web app sends the English source
// strings rendered on screen plus the visitor's detected language; results are
// cached server-side so each phrase is only machine-translated once.
i18nRouter.post(
  "/translate",
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        lang: z.string().min(2).max(10),
        texts: z.array(z.string().min(1).max(2000)).min(1).max(100),
      }),
      req.body
    );
    if (!isValidLocale(data.lang)) return res.status(400).json({ error: "Invalid language" });
    const translations = await translateUiStrings(data.texts, data.lang);
    if (normalizeLocale(data.lang) !== "en" && Object.keys(translations).length === 0) {
      return res.status(503).json({ error: "Translation is temporarily unavailable. Please try again later." });
    }
    res.json({ translations });
  })
);
