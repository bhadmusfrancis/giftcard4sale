import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "GiftCard4Sale Terms of Service — rules for selling gift cards on giftcard4sale.com.",
  alternates: { canonical: "/terms" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="prose prose-slate mt-3 max-w-none text-slate-700">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const updated = "June 20, 2026";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-slate-500">Last updated: {updated}</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Terms of Service</h1>
      <p className="mt-4 text-slate-600">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of GiftCard4Sale.com and related services
        (collectively, the &quot;Service&quot;) operated by GiftCard4Sale (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using the
        Service, you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <Section title="1. Eligibility">
        <p>
          You must be at least 18 years old (or the age of majority in your jurisdiction) and able to form a binding
          contract. You represent that you are legally permitted to sell the gift cards you submit and that you comply
          with all applicable laws in your country of residence and the country of origin of each card.
        </p>
      </Section>

      <Section title="2. The Service">
        <p>
          GiftCard4Sale provides an online platform where verified sellers may offer unused gift cards for purchase by
          the Service or its partners. We display rates, accept trade submissions, verify cards, and credit approved
          payouts to your in-platform wallet in USDT, Nigerian Naira (NGN), or Ghanaian Cedi (GHS), subject to
          withdrawal processing.
        </p>
        <p>
          We may modify rates, supported brands, payout methods, or verification requirements at any time. Quotes shown
          on the site are estimates until a trade is reviewed and approved.
        </p>
        <p>
          GiftCard4Sale is an independent service. We are not affiliated with, endorsed by, or partners of Amazon,
          Apple, Google, Microsoft, Steam, Sony, or any other gift card issuer. References to third-party brands are
          solely to identify the types of gift cards we may buy. More information is available on our{" "}
          <Link href="/about" className="text-brand-700 hover:underline">
            About us
          </Link>{" "}
          page.
        </p>
      </Section>

      <Section title="3. Account registration and security">
        <ul className="list-disc pl-5 space-y-2">
          <li>You must provide accurate registration information and keep your account credentials confidential.</li>
          <li>You are responsible for all activity under your account.</li>
          <li>You must verify your email address before submitting trades or requesting withdrawals.</li>
          <li>Notify us immediately at {SUPPORT_EMAIL} if you suspect unauthorized access.</li>
        </ul>
      </Section>

      <Section title="4. Submitting trades">
        <p>When you submit a gift card trade, you represent and warrant that:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The card is unused, valid, and has the balance you declare.</li>
          <li>You are the lawful owner or authorized to transfer the card.</li>
          <li>Photos, e-codes, receipts, and denomination details you provide are accurate and unaltered.</li>
          <li>The card is not stolen, obtained by fraud, or subject to a chargeback or dispute.</li>
        </ul>
        <p>
          We may reject trades that fail verification, appear used or tampered with, violate issuer terms, or pose
          compliance risk. Repeated invalid submissions may reduce your trust score and lead to account suspension.
        </p>
      </Section>

      <Section title="5. Verification, processing, and cancellation">
        <p>
          Trades pass through review and processing stages. We may request additional information through in-app chat.
          You may cancel a trade only while it remains in a cancellable status shown in your dashboard. Once processing
          has begun, cancellation may not be available.
        </p>
        <p>
          We assign each trade a unique Trade ID for reference. Processing times vary and are not guaranteed.
        </p>
      </Section>

      <Section title="6. Payouts and wallet">
        <p>
          Approved trade value is credited to your GiftCard4Sale wallet in the payout currency you selected. Withdrawals
          are subject to review, minimum amounts, and correct payout details (crypto address or bank account). We may
          delay or reject withdrawals that trigger fraud, AML, or compliance concerns.
        </p>
        <p>
          You are responsible for providing valid withdrawal destinations. Incorrect details may result in irreversible
          loss of funds once a payout is sent.
        </p>
      </Section>

      <Section title="7. Fees and rate adjustments">
        <p>
          Exchange rates and deductions applied to your quote are disclosed at trade creation. We may adjust the final
          payout if verification reveals a different denomination, region, receipt status, or card condition than
          declared. Administrative corrections will be documented in the trade record.
        </p>
      </Section>

      <Section title="8. Prohibited conduct">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Submit fraudulent, stolen, or already-redeemed gift cards.</li>
          <li>Misrepresent card value, region, medium (physical/e-code), or receipt status.</li>
          <li>Use the Service for money laundering, sanctions evasion, or other illegal activity.</li>
          <li>Circumvent security, scrape rates abusively, or interfere with platform operations.</li>
          <li>Create multiple accounts to evade restrictions or trust scores.</li>
        </ul>
      </Section>

      <Section title="9. Trust scores and enforcement">
        <p>
          We maintain good/bad transaction scores and may suspend or terminate accounts that violate these Terms or
          present elevated risk. Suspended users forfeit access to pending trades at our discretion where permitted by
          law.
        </p>
      </Section>

      <Section title="10. Referral program">
        <p>
          Referral bonuses, if offered, are credited according to the rate displayed in your account. We may change or
          discontinue referral terms with notice on the site. Abuse of referrals (self-referrals, fake accounts) voids
          bonuses.
        </p>
      </Section>

      <Section title="11. Intellectual property">
        <p>
          The Service, branding, software, and content are owned by GiftCard4Sale or its licensors. You receive a
          limited, non-exclusive license to use the Service for its intended purpose. Gift card brand names and logos
          belong to their respective owners.
        </p>
      </Section>

      <Section title="12. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
          WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED ACCESS, SPECIFIC EXCHANGE RATES, OR PROCESSING TIMES.
        </p>
      </Section>

      <Section title="13. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, GIFTCARD4SALE AND ITS OFFICERS, EMPLOYEES, AND PARTNERS WILL NOT BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA,
          OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE
          IS LIMITED TO THE GREATER OF (A) AMOUNTS PAID TO YOU IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE
          HUNDRED US DOLLARS (USD $100).
        </p>
      </Section>

      <Section title="14. Indemnification">
        <p>
          You agree to indemnify and hold harmless GiftCard4Sale from claims, losses, and expenses (including reasonable
          legal fees) arising from your trades, your breach of these Terms, or your violation of any law or third-party
          rights.
        </p>
      </Section>

      <Section title="15. Dispute resolution">
        <p>
          Contact {SUPPORT_EMAIL} first to resolve trade or account disputes. If we cannot resolve a dispute
          informally, you agree that claims will be handled according to the governing law below, except where mandatory
          consumer protection laws in your jurisdiction provide otherwise.
        </p>
      </Section>

      <Section title="16. Governing law">
        <p>
          These Terms are governed by the laws applicable to GiftCard4Sale&apos;s place of operation, without regard to
          conflict-of-law rules, unless mandatory local law requires otherwise.
        </p>
      </Section>

      <Section title="17. Changes">
        <p>
          We may update these Terms by posting a revised version on GiftCard4Sale.com with a new &quot;Last updated&quot; date.
          Material changes may also be communicated by email or in-app notice. Continued use after changes constitutes
          acceptance.
        </p>
      </Section>

      <Section title="18. Contact">
        <p>
          Questions about these Terms:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-700 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="mt-4 text-sm text-slate-500">
          See also our <Link href="/privacy" className="text-brand-700 hover:underline">Privacy Policy</Link>.
        </p>
      </Section>
    </div>
  );
}
