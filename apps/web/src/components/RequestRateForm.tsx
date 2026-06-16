"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export function RequestRateForm({ cardName }: { cardName: string }) {
  const { user } = useAuth();
  const [country, setCountry] = useState("");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Can&apos;t find your rate? <Link href="/login" className="text-brand-700 underline">Log in</Link> to request a rate
        that isn&apos;t listed.
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api<{ message: string }>("/cards/request-rate", {
        body: { cardType: cardName, country, details },
      });
      setMsg(res.message);
      setCountry("");
      setDetails("");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold">Request a rate</h3>
      <p className="mt-1 text-sm text-slate-600">Don&apos;t see your country/variant? Ask us.</p>
      <div className="mt-3 space-y-3">
        <input className="input" placeholder="Country (e.g. Japan)" value={country} onChange={(e) => setCountry(e.target.value)} />
        <textarea className="input" placeholder="Any details (denomination, e-code, etc.)" value={details} onChange={(e) => setDetails(e.target.value)} />
        <button onClick={submit} disabled={busy || !country} className="btn-ghost w-full">
          {busy ? "Sending…" : "Send request"}
        </button>
        {msg && <p className="text-sm text-brand-700">{msg}</p>}
      </div>
    </div>
  );
}
