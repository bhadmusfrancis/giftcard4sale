"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { calculateRateQuote } from "@gc4s/shared";
import { api } from "@/lib/api";
import { money, date } from "@/lib/format";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [platformConfig, setPlatformConfig] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [modReason, setModReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [tradeLimit, setTradeLimit] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");

  const [rateMode, setRateMode] = useState<"manual" | "catalog">("manual");
  const [tradeForm, setTradeForm] = useState({
    cardTypeId: "",
    rateId: "",
    country: "USA",
    currency: "USD",
    medium: "PHYSICAL" as "PHYSICAL" | "ECODE",
    cardAmount: 100,
    payoutCurrency: "NGN" as "USDT" | "NGN" | "GHS",
    receiptType: "NONE" as "NONE" | "CASH" | "DEBIT",
    nairaPerUnit: "",
    effectiveRate: "",
    quotedPayout: "",
    ecodes: "",
    notes: "",
    markPaid: false,
    startNoOnes: false,
  });

  async function load() {
    const [detail, cardList, configRes] = await Promise.all([
      api(`/admin/users/${id}`),
      api("/admin/cards"),
      api("/admin/config"),
    ]);
    setData(detail);
    setCards(cardList.cards.filter((c: any) => c.active));
    setPlatformConfig(configRes.config);
    setTradeLimit(detail.user.maxConcurrentTrades?.toString() ?? "");
    setAdminNotes(detail.user.adminNotes ?? "");
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!tradeForm.cardTypeId) {
      setRates([]);
      return;
    }
    api(`/admin/cards/${tradeForm.cardTypeId}/rates`).then((d) => {
      const active = d.rates.filter((r: any) => r.active);
      setRates(active);
      if (rateMode === "catalog") {
        setTradeForm((f) => ({ ...f, rateId: "" }));
      }
    });
  }, [tradeForm.cardTypeId, rateMode]);

  useEffect(() => {
    if (rateMode !== "catalog") return;
    const rate = rates.find((r) => r.id === tradeForm.rateId);
    if (rate) {
      setTradeForm((f) => ({
        ...f,
        country: rate.country,
        currency: rate.currency,
        medium: rate.medium,
        nairaPerUnit: String(rate.nairaPerUnit),
        effectiveRate: "",
        quotedPayout: "",
      }));
    }
  }, [tradeForm.rateId, rates, rateMode]);

  const catalogTiers = useMemo(() => {
    const seen = new Set<string>();
    return rates.filter((r) => {
      const key = `${r.country}|${r.currency}|${r.medium}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rates]);

  const payoutPreview = useMemo(() => {
    const naira = Number(tradeForm.nairaPerUnit);
    if (!platformConfig || !naira || !tradeForm.cardAmount) return null;
    try {
      return calculateRateQuote({
        nairaPerUnit: naira,
        cardAmount: tradeForm.cardAmount,
        payoutCurrency: tradeForm.payoutCurrency,
        medium: tradeForm.medium,
        rates: platformConfig.rates,
        reductions: platformConfig.reductions,
      });
    } catch {
      return null;
    }
  }, [platformConfig, tradeForm.nairaPerUnit, tradeForm.cardAmount, tradeForm.payoutCurrency, tradeForm.medium]);

  async function moderate(action: string, extra: Record<string, unknown> = {}) {
    setMsg(null);
    setErr(null);
    try {
      await api(`/admin/users/${id}/moderate`, {
        method: "POST",
        body: {
          action,
          reason: modReason || undefined,
          suspendDays: action === "suspend" ? suspendDays : undefined,
          maxConcurrentTrades: action === "set_limits" ? (tradeLimit === "" ? null : Number(tradeLimit)) : undefined,
          adminNotes: action === "set_limits" ? adminNotes || null : undefined,
          ...extra,
        },
      });
      setMsg(`Action "${action}" applied.`);
      setModReason("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function adjustBalance() {
    const currency = prompt("Currency (USDT/NGN/GHS)", "NGN");
    if (!currency) return;
    const amount = Number(prompt("Amount (negative to debit)", "0"));
    if (!amount) return;
    await api(`/admin/users/${id}/adjust-balance`, {
      body: { currency, amount, description: "Admin adjustment" },
    });
    await load();
  }

  async function createTrade(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const nairaPerUnit = Number(tradeForm.nairaPerUnit);
    if (!tradeForm.cardTypeId) {
      setErr("Select a gift card.");
      return;
    }
    if (rateMode === "catalog" && !tradeForm.rateId) {
      setErr("Select a catalog rate tier, or switch to manual rate.");
      return;
    }
    if (!nairaPerUnit || nairaPerUnit <= 0) {
      setErr("Enter a valid naira per unit rate.");
      return;
    }
    if (rateMode === "manual" && (!tradeForm.country.trim() || !tradeForm.currency.trim())) {
      setErr("Country and currency are required for manual rates.");
      return;
    }

    try {
      const body: Record<string, unknown> = {
        userId: id,
        cardAmount: tradeForm.cardAmount,
        payoutCurrency: tradeForm.payoutCurrency,
        receiptType: tradeForm.receiptType,
        nairaPerUnit,
        markPaid: tradeForm.markPaid,
        startNoOnes: tradeForm.startNoOnes,
        ecodes: tradeForm.ecodes || undefined,
        notes: tradeForm.notes || undefined,
      };

      if (rateMode === "catalog" && tradeForm.rateId) {
        body.rateId = tradeForm.rateId;
      } else {
        body.cardTypeId = tradeForm.cardTypeId;
        body.country = tradeForm.country.trim();
        body.currency = tradeForm.currency.trim().toUpperCase();
        body.medium = tradeForm.medium;
      }

      if (tradeForm.effectiveRate) body.effectiveRate = Number(tradeForm.effectiveRate);
      if (tradeForm.quotedPayout) body.quotedPayout = Number(tradeForm.quotedPayout);

      const res = await api("/admin/trades", { body });
      setMsg(`Trade ${res.trade.tradeNumber} created.`);
      router.push(`/admin/trades/${res.trade.id}`);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (!data) return <div className="p-8 text-slate-500">Loading…</div>;

  const u = data.user;
  const stats = data.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/users" className="text-sm text-brand-700">← Users</Link>
        <h2 className="text-2xl font-bold">{u.displayName || u.email}</h2>
        <span className={`badge ${u.accountStatus === "BANNED" ? "bg-red-100 text-red-800" : u.accountStatus === "SUSPENDED" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
          {u.accountStatus}
        </span>
      </div>

      {msg && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{msg}</p>}
      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active trades" value={`${stats.activeTrades} / ${stats.tradeLimit}`} />
        <Stat label="Recent rejections" value={`${stats.recentRejections} (${stats.autoSuspendWindowDays}d window)`} />
        <Stat label="Total trades" value={stats.totalTrades} />
        <Stat label="Auto-suspend at" value={`${stats.autoSuspendThreshold} rejections`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h3 className="font-bold">Account moderation</h3>
          <p className="text-sm text-slate-500">{u.email} · joined {date(u.createdAt)}</p>
          {u.suspensionReason && (
            <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">{u.suspensionReason}</p>
          )}
          <textarea
            className="input min-h-[72px]"
            placeholder="Reason (shown to user for ban/suspend)"
            value={modReason}
            onChange={(e) => setModReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => moderate("suspend")} className="rounded bg-amber-100 px-3 py-1.5 text-sm text-amber-900">Suspend</button>
            <input
              type="number"
              min={1}
              max={365}
              className="input w-20"
              value={suspendDays}
              onChange={(e) => setSuspendDays(Number(e.target.value))}
              title="Suspend days"
            />
            <span className="self-center text-xs text-slate-500">days</span>
            <button onClick={() => confirm("Permanently ban this user?") && moderate("ban")} className="rounded bg-red-100 px-3 py-1.5 text-sm text-red-800">Ban</button>
            <button onClick={() => moderate("unsuspend")} className="rounded bg-emerald-100 px-3 py-1.5 text-sm text-emerald-800">Unsuspend</button>
            <button onClick={() => moderate("lift_ban")} className="rounded bg-slate-100 px-3 py-1.5 text-sm">Lift ban</button>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <label className="label">Max concurrent trades (blank = platform default)</label>
            <input className="input" type="number" min={1} max={50} value={tradeLimit} onChange={(e) => setTradeLimit(e.target.value)} />
            <label className="label">Admin notes (internal)</label>
            <textarea className="input min-h-[60px]" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            <button onClick={() => moderate("set_limits")} className="btn-ghost">Save limits & notes</button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button onClick={adjustBalance} className="rounded bg-slate-100 px-3 py-1.5 text-sm">Adjust balance</button>
            <button onClick={() => api(`/admin/users/${id}/score`, { body: { kind: "good" } }).then(load)} className="rounded bg-emerald-100 px-3 py-1.5 text-sm">+Good</button>
            <button onClick={() => api(`/admin/users/${id}/score`, { body: { kind: "bad" } }).then(load)} className="rounded bg-red-100 px-3 py-1.5 text-sm">+Bad</button>
          </div>
        </div>

        <form onSubmit={createTrade} className="card space-y-3 p-6">
          <h3 className="font-bold">Open trade on behalf of user</h3>
          <p className="text-sm text-slate-500">Set the naira rate manually, or pick a catalog tier as a starting point.</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRateMode("manual")}
              className={`badge ${rateMode === "manual" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Manual rate
            </button>
            <button
              type="button"
              onClick={() => setRateMode("catalog")}
              className={`badge ${rateMode === "catalog" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              From catalog
            </button>
          </div>

          <select className="input" value={tradeForm.cardTypeId} onChange={(e) => setTradeForm({ ...tradeForm, cardTypeId: e.target.value })} required>
            <option value="">Select gift card…</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {rateMode === "catalog" ? (
            <select className="input" value={tradeForm.rateId} onChange={(e) => setTradeForm({ ...tradeForm, rateId: e.target.value })} required={rateMode === "catalog"} disabled={!rates.length}>
              <option value="">Select rate tier…</option>
              {rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.country} · {r.medium} · {r.minDenom ?? "any"}–{r.maxDenom ?? "any"} {r.currency} @ ₦{r.nairaPerUnit}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Country</label>
                  <input
                    className="input"
                    list="country-suggestions"
                    value={tradeForm.country}
                    onChange={(e) => setTradeForm({ ...tradeForm, country: e.target.value })}
                    required
                  />
                  <datalist id="country-suggestions">
                    {catalogTiers.map((r) => (
                      <option key={`${r.country}-${r.currency}`} value={r.country} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <input
                    className="input"
                    value={tradeForm.currency}
                    onChange={(e) => setTradeForm({ ...tradeForm, currency: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Medium</label>
                  <select className="input" value={tradeForm.medium} onChange={(e) => setTradeForm({ ...tradeForm, medium: e.target.value as "PHYSICAL" | "ECODE" })}>
                    <option value="PHYSICAL">Physical</option>
                    <option value="ECODE">E-code</option>
                  </select>
                </div>
              </div>
              {catalogTiers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {catalogTiers.slice(0, 8).map((r) => (
                    <button
                      key={`${r.country}-${r.currency}-${r.medium}`}
                      type="button"
                      className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                      onClick={() =>
                        setTradeForm((f) => ({
                          ...f,
                          country: r.country,
                          currency: r.currency,
                          medium: r.medium,
                          nairaPerUnit: String(r.nairaPerUnit),
                        }))
                      }
                    >
                      {r.country} {r.currency} ₦{r.nairaPerUnit}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Naira per unit *</label>
              <input
                type="number"
                step="any"
                className="input"
                value={tradeForm.nairaPerUnit}
                onChange={(e) => setTradeForm({ ...tradeForm, nairaPerUnit: e.target.value, quotedPayout: "" })}
                placeholder="e.g. 1650"
                required
              />
            </div>
            <div>
              <label className="label">Card amount *</label>
              <input type="number" className="input" value={tradeForm.cardAmount} onChange={(e) => setTradeForm({ ...tradeForm, cardAmount: Number(e.target.value) })} required />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Payout currency</label>
              <select className="input" value={tradeForm.payoutCurrency} onChange={(e) => setTradeForm({ ...tradeForm, payoutCurrency: e.target.value as any })}>
                <option value="NGN">NGN</option>
                <option value="USDT">USDT</option>
                <option value="GHS">GHS</option>
              </select>
            </div>
            <div>
              <label className="label">Quoted payout (optional override)</label>
              <input
                className="input"
                value={tradeForm.quotedPayout}
                onChange={(e) => setTradeForm({ ...tradeForm, quotedPayout: e.target.value })}
                placeholder={payoutPreview ? String(payoutPreview.payoutAmount) : "Auto from rate"}
              />
            </div>
          </div>

          {payoutPreview && !tradeForm.quotedPayout && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Calculated payout: <strong>{money(payoutPreview.payoutAmount, tradeForm.payoutCurrency)}</strong>
              {" "}(effective ₦{payoutPreview.effectiveNairaPerUnit.toFixed(2)}/unit)
            </p>
          )}

          <div>
            <label className="label">Effective rate override (optional)</label>
            <input
              className="input"
              value={tradeForm.effectiveRate}
              onChange={(e) => setTradeForm({ ...tradeForm, effectiveRate: e.target.value })}
              placeholder="Defaults from platform deductions"
            />
          </div>
          <select className="input" value={tradeForm.receiptType} onChange={(e) => setTradeForm({ ...tradeForm, receiptType: e.target.value as any })}>
            <option value="NONE">No receipt</option>
            <option value="CASH">Cash receipt</option>
            <option value="DEBIT">Debit receipt</option>
          </select>
          <textarea className="input min-h-[60px]" placeholder="E-codes (optional)" value={tradeForm.ecodes} onChange={(e) => setTradeForm({ ...tradeForm, ecodes: e.target.value })} />
          <input className="input" placeholder="Admin note" value={tradeForm.notes} onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tradeForm.startNoOnes} onChange={(e) => setTradeForm({ ...tradeForm, startNoOnes: e.target.checked })} />
            Start NoOnes processing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tradeForm.markPaid} onChange={(e) => setTradeForm({ ...tradeForm, markPaid: e.target.checked })} />
            Mark paid immediately
          </label>
          <button className="btn-primary w-full">Create trade</button>
        </form>
      </div>

      <div className="card p-6">
        <h3 className="mb-3 font-bold">Moderation history</h3>
        <div className="divide-y divide-slate-100">
          {data.events.map((e: any) => (
            <div key={e.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <div>
                <span className="font-medium">{e.action}</span>
                {e.reason && <span className="text-slate-500"> — {e.reason}</span>}
                {e.admin && <div className="text-xs text-slate-400">by {e.admin.email}</div>}
              </div>
              <div className="text-slate-500">{date(e.createdAt)}</div>
            </div>
          ))}
          {data.events.length === 0 && <p className="text-sm text-slate-400">No moderation events.</p>}
        </div>
      </div>

      <div className="card p-6 text-sm">
        <h3 className="mb-2 font-bold">Wallets</h3>
        <div className="flex flex-wrap gap-4">
          <span>{money(u.balanceUsdt, "USDT")}</span>
          <span>{money(u.balanceNgn, "NGN")}</span>
          <span>{money(u.balanceGhs, "GHS")}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
