import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "GiftCard4Sale Privacy Policy — how we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="prose prose-slate mt-3 max-w-none text-slate-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const updated = "June 20, 2026";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-slate-500">Last updated: {updated}</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-4 text-slate-600">
        GiftCard4Sale (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates GiftCard4Sale.com (the &quot;Service&quot;). This Privacy Policy
        explains what personal data we collect, how we use it, who we share it with, and the choices you have. By using
        the Service, you agree to this Policy. Please also read our{" "}
        <Link href="/terms" className="text-brand-700 hover:underline">
          Terms of Service
        </Link>
        .
      </p>

      <Section title="1. Data controller">
        <p>
          For questions about this Policy or to exercise your privacy rights, use our{" "}
          <Link href="/contact" className="text-brand-700 hover:underline">
            Contact page
          </Link>
          .
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>
          <strong>Account information:</strong> email address, display name, password (stored as a secure hash), referral
          code, email verification status, role, trust scores, and wallet balances.
        </p>
        <p>
          <strong>Trade and verification data:</strong> gift card brand, country, denomination, payout currency, uploaded
          images, e-codes, receipt photos, notes, trade status, unique Trade ID, and chat messages related to your trades.
        </p>
        <p>
          <strong>Withdrawal and payout data:</strong> withdrawal amounts, currency, crypto wallet addresses, and bank
          account details you save for Naira payouts.
        </p>
        <p>
          <strong>Technical data:</strong> IP address, browser type, device information, and usage logs collected
          automatically for security, fraud prevention, and service operation. We also collect anonymous first-party
          website analytics (page path, referrer hostname, device type, approximate country derived from
          IP address, and anonymous visitor/session IDs) to understand traffic on the public site.
        </p>
        <p>
          <strong>Communications:</strong> emails we send you (verification, password reset, trade and withdrawal updates)
          and support correspondence.
        </p>
      </Section>

      <Section title="3. How we use your information">
        <ul className="list-disc pl-5 space-y-2">
          <li>Create and manage your account.</li>
          <li>Verify identity, email ownership, and gift card submissions.</li>
          <li>Process trades, calculate payouts, and operate your wallet.</li>
          <li>Send transactional notifications (email, in-app, and push where enabled).</li>
          <li>Detect fraud, abuse, and compliance risks.</li>
          <li>Measure anonymous website traffic and improve the public site experience.</li>
          <li>Improve rates, catalog, and platform performance.</li>
          <li>Comply with legal obligations and respond to lawful requests.</li>
        </ul>
      </Section>

      <Section title="4. Legal bases (where applicable)">
        <p>
          Depending on your location, we process personal data based on: performance of our contract with you (providing
          the Service), legitimate interests (security, fraud prevention, improving the platform), compliance with legal
          obligations, and your consent where required (e.g., optional marketing, if offered).
        </p>
      </Section>

      <Section title="5. How we share information">
        <p>We do not sell your personal information. We may share data with:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Service providers</strong> — email delivery (SMTP), cloud hosting, object storage for uploads, payment
            and payout processors, and analytics/security tools bound by confidentiality obligations.
          </li>
          <li>
            <strong>Marketplace and fulfillment partners</strong> — where necessary to verify and resell gift cards you
            submit (card details required for fulfillment are shared only as needed).
          </li>
          <li>
            <strong>Law enforcement or regulators</strong> — when required by law or to protect rights, safety, and
            platform integrity.
          </li>
          <li>
            <strong>Business transfers</strong> — in connection with a merger, acquisition, or asset sale, with notice
            where required.
          </li>
        </ul>
      </Section>

      <Section title="6. International transfers">
        <p>
          Your data may be processed in countries other than your own. Where required, we implement appropriate
          safeguards for cross-border transfers.
        </p>
      </Section>

      <Section title="7. Data retention">
        <p>
          We retain account and trade records while your account is active and as needed to comply with law, resolve
          disputes, and enforce agreements. Trade images and verification data may be retained for fraud prevention after
          trade completion. Anonymous website analytics page views are typically retained for up to 90 days. You may
          request deletion subject to legal and operational requirements.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We use industry-standard measures including encrypted passwords, access controls, and secure infrastructure.
          No method of transmission or storage is 100% secure; you are responsible for safeguarding your login
          credentials.
        </p>
      </Section>

      <Section title="9. Your rights">
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, delete, restrict, or port your personal
          data, and to object to certain processing. To exercise these rights, use our{" "}
          <Link href="/contact" className="text-brand-700 hover:underline">
            Contact page
          </Link>
          . We may verify your identity before responding.
        </p>
        <p>
          If you are in the European Economic Area or UK, you may lodge a complaint with your local data protection
          authority.
        </p>
      </Section>

      <Section title="10. Email and notifications">
        <p>
          We send <strong>transactional emails</strong> about account security (verification, password changes),
          trades, withdrawals, and important account activity. These are necessary to operate the Service and are not
          marketing messages.
        </p>
        <p>
          You cannot opt out of essential transactional emails while maintaining an active account. You may disable web
          push notifications in your browser settings.
        </p>
      </Section>

      <Section title="11. Cookies and local storage">
        <p>
          We use essential cookies and local storage (e.g., authentication tokens) to keep you signed in and secure the
          Service. We also store anonymous visitor and session identifiers in local/session storage for first-party
          website traffic analytics shown to administrators. We do not use third-party advertising cookies on the core
          platform.
        </p>
      </Section>

      <Section title="12. Children">
        <p>
          The Service is not directed to anyone under 18. We do not knowingly collect data from children. Contact us if
          you believe a minor has registered an account.
        </p>
      </Section>

      <Section title="13. Changes to this Policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the revised version with an updated date and,
          for material changes, provide additional notice where appropriate.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Privacy inquiries: use our{" "}
          <Link href="/contact" className="text-brand-700 hover:underline">
            Contact page
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
