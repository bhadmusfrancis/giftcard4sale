"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

/** Short independent-business disclaimer for footers and landing pages. */
export function BrandAffiliationDisclaimer({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      {t(
        "GiftCard4Sale is an independent gift card exchange. We are not affiliated with, endorsed by, or partners of Amazon, Apple, Google, Microsoft, Steam, Sony, or any other gift card issuer. Brand names appear only to identify card types we buy."
      )}{" "}
      <Link href="/about" className="font-medium text-brand-700 hover:underline">
        {t("Learn more about us")}
      </Link>
      .
    </p>
  );
}
