"use client";

import { SUPPORT_EMAIL } from "@/lib/site";

/** Opens the user's mail client without rendering the address as visible text. */
export function EmailSupportButton({ className = "btn-primary mt-4 inline-flex" }: { className?: string }) {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("GiftCard4Sale support")}`} className={className}>
      Email support
    </a>
  );
}
