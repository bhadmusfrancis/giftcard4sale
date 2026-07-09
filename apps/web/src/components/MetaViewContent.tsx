"use client";

import { useEffect, useRef } from "react";
import { trackMeta } from "@/lib/metaPixel";

/** Fires ViewContent once when a gift-card landing page mounts. */
export function MetaViewContent({
  contentName,
  contentIds,
  value,
  currency = "USD",
}: {
  contentName: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackMeta("ViewContent", {
      content_name: contentName,
      content_ids: contentIds,
      content_type: "product",
      value,
      currency,
    });
  }, [contentName, contentIds, value, currency]);

  return null;
}
