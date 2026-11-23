import type { Metadata } from "next";
import Link from "next/link";
import { BrandAffiliationDisclaimer } from "@/components/BrandAffiliationDisclaimer";
import { EmailSupportButton } from "@/components/EmailSupportButton";
import { getPageDict, makeTr } from "@/lib/seo/localized";
import { languageAlternates, localizedPath } from "@/lib/locale";

export const revalidate = 3600;

const META_TITLE = "Contact";
const META_DESC = "Contact GiftCard4Sale support for account, trade, and payout questions.";

const STRINGS = [
  META_TITLE,
  META_DESC,
  "Contact us",
  "We're here to help with GiftCard4Sale accounts, trades, rates, and withdrawals. Use the options below — we respond from our official GiftCard4Sale support inbox only.",
  "Email support",
  "Best for trade issues, withdrawals, and account help. Tap the button to open your email app — we don't publish the inbox address on the page to reduce spam and abuse.",
  "Already trading with us? You can also message support from the chat on an open trade in your dashboard.",
  "Website",
  "All trading happens only on our official site.",
  "What to include",
  "Your account email",
  "Trade ID (if the issue is about a trade)",
  "A short description of the problem",
  "We will never ask you for passwords to Apple, Amazon, Google, banks, or crypto wallets. GiftCard4Sale only needs the gift card details you submit inside your logged-in dashboard.",
  "Learn more on our",
  "About us",
  "page, or read the",
  "Terms",
  "and",
  "Privacy Policy",
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
      canonical: localizedPath(params.lang, "/contact"),
      languages: languageAlternates("/contact"),
    },
  };
}

export default async function LocalizedContactPage({
  params,
}: {
  params: { lang: string };
}) {
  const tr = makeTr(await getPageDict(params.lang, STRINGS));
  const lang = params.lang;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{tr("Contact us")}</h1>
      <p className="mt-4 text-slate-600">
        {tr("We're here to help with GiftCard4Sale accounts, trades, rates, and withdrawals. Use the options below — we respond from our official GiftCard4Sale support inbox only.")}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">{tr("Email support")}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {tr("Best for trade issues, withdrawals, and account help. Tap the button to open your email app — we don't publish the inbox address on the page to reduce spam and abuse.")}
          </p>
          <EmailSupportButton />
          <p className="mt-3 text-xs text-slate-500">
            {tr("Already trading with us? You can also message support from the chat on an open trade in your dashboard.")}
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">{tr("Website")}</h2>
          <p className="mt-2 text-sm text-slate-600">{tr("All trading happens only on our official site.")}</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
            giftcard4sale.com
          </Link>
        </div>
      </div>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">{tr("What to include")}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>{tr("Your account email")}</li>
          <li>{tr("Trade ID (if the issue is about a trade)")}</li>
          <li>{tr("A short description of the problem")}</li>
        </ul>
        <p className="text-sm text-slate-600">
          {tr("We will never ask you for passwords to Apple, Amazon, Google, banks, or crypto wallets. GiftCard4Sale only needs the gift card details you submit inside your logged-in dashboard.")}
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <BrandAffiliationDisclaimer />
      </section>

      <p className="mt-8 text-sm text-slate-500">
        {tr("Learn more on our")}{" "}
        <Link href={localizedPath(lang, "/about")} className="text-brand-700 hover:underline">
          {tr("About us")}
        </Link>{" "}
        {tr("page, or read the")}{" "}
        <Link href="/terms" className="text-brand-700 hover:underline">
          {tr("Terms")}
        </Link>{" "}
        {tr("and")}{" "}
        <Link href="/privacy" className="text-brand-700 hover:underline">
          {tr("Privacy Policy")}
        </Link>
        .
      </p>
    </div>
  );
}
