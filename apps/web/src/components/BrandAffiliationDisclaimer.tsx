import Link from "next/link";

/** Short independent-business disclaimer for footers and landing pages. */
export function BrandAffiliationDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      GiftCard4Sale is an <strong className="font-semibold text-slate-600">independent</strong> gift card exchange. We
      are <strong className="font-semibold text-slate-600">not affiliated with, endorsed by, or partners of</strong>{" "}
      Amazon, Apple, Google, Microsoft, Steam, Sony, or any other gift card issuer. Brand names appear only to identify
      card types we buy.{" "}
      <Link href="/about" className="font-medium text-brand-700 hover:underline">
        Learn more about us
      </Link>
      .
    </p>
  );
}
