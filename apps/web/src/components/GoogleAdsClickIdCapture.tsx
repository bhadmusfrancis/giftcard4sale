"use client";

import { useEffect } from "react";
import { captureGclidFromUrl } from "@/lib/googleAds";

/** Captures gclid from Google Ads click URLs into localStorage. */
export function GoogleAdsClickIdCapture() {
  useEffect(() => {
    captureGclidFromUrl();
  }, []);
  return null;
}
