import type { Metadata } from "next";
import Link from "next/link";
import { BrandAffiliationDisclaimer } from "@/components/BrandAffiliationDisclaimer";
import { getPageDict, makeTr } from "@/lib/seo/localized";
import { languageAlternates, localizedPath } from "@/lib/locale";

export const revalidate = 3600;

const META_TITLE = "About Us";
const META_DESC =
  "GiftCard4Sale is an independent gift card exchange. Sell unused gift cards for USDT, Nigerian Naira, or Ghana Cedi on giftcard4sale.com.";

const STRINGS = [
  META_TITLE,
  META_DESC,
  "About us",
  "We operate an independent online platform where people sell unused gift cards and get paid in USDT, Nigerian Naira (NGN), or Ghanaian Cedi (GHS).",
  "What we do",
  "GiftCard4Sale.com is our own branded marketplace. Customers create an account on our website, check live rates, submit a gift card (photos or e-code), and — after verification — receive payout credit in their GiftCard4Sale wallet. They can then withdraw to bank transfer, mobile money, or USDT, subject to our processes and limits.",
  "Choose a card type and calculate your payout on our site.",
  "Submit the card you legally own through your GiftCard4Sale account.",
  "We review the submission on our platform.",
  "Approved trades credit your GiftCard4Sale wallet; you withdraw when ready.",
  "Who we are",
  "GiftCard4Sale is an independent business serving sellers primarily in Nigeria and Ghana, and other customers who can legally use the Service. We are not a bank, not a crypto exchange login portal, and not an official store for Apple, Amazon, Steam, Google, Microsoft, or any gift card issuer.",
  "All trading happens on",
  "under the GiftCard4Sale name and logo. We never ask for your Apple ID password, Amazon password, bank login, or cryptocurrency seed phrases.",
  "Brand relationships",
  "Trust & safety",
  "Only submit gift cards you legally own.",
  "Email verification is required before trading or withdrawing.",
  "Invalid, used, or fraudulent cards may be rejected and can affect account standing.",
  "Read our",
  "Terms of Service",
  "and",
  "Privacy Policy",
  "Contact",
  "Questions about the Service, an account, or a trade: visit our",
  "Contact page",
  "Sell a gift card",
  "Contact support",
] as const;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  return {
    title: tr(META_TITLE),
    description: tr(META_DESC),
    alternates: {
      canonical: localizedPath(params.lang, "/about"),
      languages: languageAlternates("/about"),
    },
  };
}

export default async function LocalizedAboutPage({
  params,
}: {
  params: { lang: string };
}) {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  const lang = params.lang;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-medium text-brand-700">GiftCard4Sale</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{tr("About us")}</h1>
      <p className="mt-4 text-lg text-slate-600">
        {tr("We operate an independent online platform where people sell unused gift cards and get paid in USDT, Nigerian Naira (NGN), or Ghanaian Cedi (GHS).")}
      </p>

      <section className="mt-10 space-y-4 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">{tr("What we do")}</h2>
        <p>
          {tr("GiftCard4Sale.com is our own branded marketplace. Customers create an account on our website, check live rates, submit a gift card (photos or e-code), and — after verification — receive payout credit in their GiftCard4Sale wallet. They can then withdraw to bank transfer, mobile money, or USDT, subject to our processes and limits.")}
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>{tr("Choose a card type and calculate your payout on our site.")}</li>
          <li>{tr("Submit the card you legally own through your GiftCard4Sale account.")}</li>
          <li>{tr("We review the submission on our platform.")}</li>
          <li>{tr("Approved trades credit your GiftCard4Sale wallet; you withdraw when ready.")}</li>
        </ol>
      </section>

      <section className="mt-10 space-y-4 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">{tr("Who we are")}</h2>
        <p>
          {tr("GiftCard4Sale is an independent business serving sellers primarily in Nigeria and Ghana, and other customers who can legally use the Service. We are not a bank, not a crypto exchange login portal, and not an official store for Apple, Amazon, Steam, Google, Microsoft, or any gift card issuer.")}
        </p>
        <p>
          {tr("All trading happens on")} <strong>giftcard4sale.com</strong>{" "}
          {tr("under the GiftCard4Sale name and logo. We never ask for your Apple ID password, Amazon password, bank login, or cryptocurrency seed phrases.")}
        </p>
      </section>

      <section className="mt-10 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">{tr("Brand relationships")}</h2>
        <BrandAffiliationDisclaimer className="!text-sm !text-slate-600" />
      </section>

      <section className="mt-10 space-y-4 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">{tr("Trust & safety")}</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>{tr("Only submit gift cards you legally own.")}</li>
          <li>{tr("Email verification is required before trading or withdrawing.")}</li>
          <li>{tr("Invalid, used, or fraudulent cards may be rejected and can affect account standing.")}</li>
          <li>
            {tr("Read our")}{" "}
            <Link href="/terms" className="font-medium text-brand-700 hover:underline">
              {tr("Terms of Service")}
            </Link>{" "}
            {tr("and")}{" "}
            <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
              {tr("Privacy Policy")}
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">{tr("Contact")}</h2>
        <p>
          {tr("Questions about the Service, an account, or a trade: visit our")}{" "}
          <Link href={localizedPath(lang, "/contact")} className="font-medium text-brand-700 hover:underline">
            {tr("Contact page")}
          </Link>
          .
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href={localizedPath(lang, "/cards")} className="btn-primary">
          {tr("Sell a gift card")}
        </Link>
        <Link href={localizedPath(lang, "/contact")} className="btn-ghost">
          {tr("Contact support")}
        </Link>
      </div>
    </div>
  );
}
