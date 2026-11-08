"use client";

import { SUPPORT_EMAIL } from "@/lib/site";
import { useT } from "@/lib/i18n";

/** Opens the user's mail client without rendering the address as visible text. */
export function EmailSupportButton({ className = "btn-primary mt-4 inline-flex" }: { className?: string }) {
  const t = useT();
  return (
    <a data-i18n-skip href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("GiftCard4Sale support")}`} className={className}>
      {t("Email support")}
    </a>
  );
}
