"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing verification token.");
      return;
    }
    api("/auth/verify-email", { body: { token } })
      .then(() => setState("ok"))
      .catch((e) => {
        setState("error");
        setMessage(e.message);
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="card p-8">
        {state === "loading" && <p>Verifying your email…</p>}
        {state === "ok" && (
          <>
            <div className="text-5xl">✅</div>
            <h1 className="mt-4 text-2xl font-bold">Email verified!</h1>
            <p className="mt-2 text-slate-600">You can now open trades and withdraw funds.</p>
            <Link href="/dashboard" className="btn-primary mt-6">Go to dashboard</Link>
          </>
        )}
        {state === "error" && (
          <>
            <div className="text-5xl">⚠️</div>
            <h1 className="mt-4 text-2xl font-bold">Verification failed</h1>
            <p className="mt-2 text-slate-600">{message}</p>
            <Link href="/dashboard" className="btn-ghost mt-6">Go to dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
