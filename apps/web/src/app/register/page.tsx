"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { TurnstileWidget, type TurnstileHandle } from "@/components/TurnstileWidget";

function RegisterInner() {
  const { register } = useAuth();
  const { lang, country, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [registerChallenge, setRegisterChallenge] = useState<string>("");
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<TurnstileHandle>(null);

  useEffect(() => {
    api<{ challenge: string; captchaSiteKey?: string | null }>("/auth/register-challenge")
      .then(({ challenge, captchaSiteKey }) => {
        setRegisterChallenge(challenge);
        setCaptchaSiteKey(captchaSiteKey || null);
      })
      .catch((e: any) => setError(e.message || "Could not load registration challenge."));
  }, []);

  useEffect(() => {
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        email,
        password,
        displayName: displayName || undefined,
        referralCode: referralCode || undefined,
        registerChallenge,
        website: "",
        acceptTerms,
        captchaToken: captchaToken || undefined,
        locale: lang,
        country: country || undefined,
      });
      router.push("/dashboard?welcome=1");
    } catch (err: any) {
      setError(err.message);
      // Turnstile tokens are single-use; get a fresh one for the next attempt.
      captchaRef.current?.reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold">{t("Create your account")}</h1>
        <p className="mt-1 text-slate-600">{t("Start selling gift cards in minutes.")}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">{t("Display name")}</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("Optional")} />
          </div>
          <div>
            <label className="label">{t("Email")}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t("Password")}</label>
            <PasswordInput value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <label className="label">{t("Referral code (optional)")}</label>
            <input className="input" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
            />
            <span>
              {t("I agree to the")}{" "}
              <Link href="/terms" className="text-brand-700 hover:underline" target="_blank">
                {t("Terms of Service")}
              </Link>{" "}
              {t("and")}{" "}
              <Link href="/privacy" className="text-brand-700 hover:underline" target="_blank">
                {t("Privacy Policy")}
              </Link>
              .
            </span>
          </label>
          {captchaSiteKey && (
            <TurnstileWidget
              ref={captchaRef}
              siteKey={captchaSiteKey}
              action="register"
              onToken={setCaptchaToken}
              onError={setError}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={busy || !acceptTerms || !registerChallenge || (!!captchaSiteKey && !captchaToken)}
          >
            {busy ? t("Creating…") : t("Create account")}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {t("Already have an account?")} <Link href="/login" className="text-brand-700 hover:underline">{t("Log in")}</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  );
}
