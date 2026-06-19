"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NoOnesSyncPanel } from "@/components/NoOnesSyncPanel";
import { NoOnesSyncProvider, useNoOnesSyncState } from "@/components/NoOnesSyncContext";

export default function AdminRatesPage() {
  const [cardsKey, setCardsKey] = useState(0);

  return (
    <NoOnesSyncProvider>
      <div className="space-y-8">
        <h2 className="text-2xl font-bold">Rates &amp; cards</h2>
        <NoOnesSyncPanel onSyncFinished={() => setCardsKey((k) => k + 1)} />
        <ConfigSection />
        <ImportSection />
        <CardsSection key={cardsKey} />
      </div>
    </NoOnesSyncProvider>
  );
}

function ConfigSection() {
  const [config, setConfig] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api("/admin/config").then((d) => setConfig(d.config));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const d = await api("/admin/config", {
      method: "PUT",
      body: {
        ngnPerUsdt: Number(config.rates.ngnPerUsdt),
        ngnPerGhs: Number(config.rates.ngnPerGhs),
        nairaReductionPercent: Number(config.reductions.nairaReductionPercent),
        fxReductionPercent: Number(config.reductions.fxReductionPercent),
        referralPercent: Number(config.referralPercent),
        noonesRateRefreshMinutes: Number(config.noonesRateRefreshMinutes ?? 15),
        noonesTopOffersForRate: Number(config.noonesTopOffersForRate ?? 3),
        minCountryOffersForDisplay: Number(config.minCountryOffersForDisplay ?? 5),
      },
    });
    if (d.config) setConfig(d.config);
    setMsg(
      d.tiersUpdated
        ? `Saved. Updated ${d.tiersUpdated} country tier(s) to match the new minimum.`
        : "Saved."
    );
  }

  if (!config) return null;

  return (
    <form onSubmit={save} className="card p-6">
      <h3 className="font-bold">Exchange rates &amp; deductions</h3>
      <p className="text-sm text-slate-500">
        Used to convert Naira card value to USDT/Cedi and to deduct the margin. NoOnes card rates are averaged from
        the top offers by completed trades. Use the NoOnes sync panel above to refresh stored rates, or sync a single
        card below.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="NGN per 1 USDT" value={config.rates.ngnPerUsdt} onChange={(v) => setConfig({ ...config, rates: { ...config.rates, ngnPerUsdt: v } })} />
        <Field label="NGN per 1 GHS (Cedi)" value={config.rates.ngnPerGhs} onChange={(v) => setConfig({ ...config, rates: { ...config.rates, ngnPerGhs: v } })} />
        <Field label="Referral %" value={config.referralPercent} onChange={(v) => setConfig({ ...config, referralPercent: v })} />
        <Field label="Naira deduction %" value={config.reductions.nairaReductionPercent} onChange={(v) => setConfig({ ...config, reductions: { ...config.reductions, nairaReductionPercent: v } })} />
        <Field label="USDT/Cedi deduction %" value={config.reductions.fxReductionPercent} onChange={(v) => setConfig({ ...config, reductions: { ...config.reductions, fxReductionPercent: v } })} />
        <Field
          label="NoOnes rate staleness (minutes)"
          value={config.noonesRateRefreshMinutes ?? 15}
          onChange={(v) => setConfig({ ...config, noonesRateRefreshMinutes: v })}
        />
        <Field
          label="NoOnes offers to average"
          value={config.noonesTopOffersForRate ?? 3}
          onChange={(v) => setConfig({ ...config, noonesTopOffersForRate: v })}
        />
        <Field
          label="Min offers per country tier"
          value={config.minCountryOffersForDisplay ?? 5}
          onChange={(v) => setConfig({ ...config, minCountryOffersForDisplay: v })}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        A country/currency tier is shown in the catalog only when it has at least this many live NoOnes buy offers.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary">Save config</button>
        {msg && <span className="text-sm text-brand-700">{msg}</span>}
      </div>
    </form>
  );
}

function ImportSection() {
  const [text, setText] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  async function doPreview() {
    setResult(null);
    const d = await api("/admin/rates/parse", { body: { text } });
    setPreview(d);
  }

  async function doImport() {
    const d = await api("/admin/rates/import", { body: { text, replaceExisting } });
    setResult(d);
    setPreview(null);
  }

  return (
    <div className="card p-6">
      <h3 className="font-bold">Paste rate text (Naira format)</h3>
      <p className="text-sm text-slate-500">
        Paste the rate list. The system deducts 20% for Naira and 30% for USDT/Cedi, ignores &quot;in Ns&quot;, and always
        uses the SLOW rate.
      </p>
      <textarea className="input mt-3 min-h-[200px] font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="===【Apple/iTunes】SLOW ===&#10;● US (200-500 in 100s) = 1092 ..." />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={doPreview} className="btn-ghost" disabled={!text}>Preview parse</button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
          Replace existing rates for these card types
        </label>
        <button onClick={doImport} className="btn-primary" disabled={!text}>Import</button>
      </div>

      {preview && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="font-semibold">{preview.entries.length} rate rows parsed</p>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr><th className="p-1">Card</th><th className="p-1">Country</th><th className="p-1">Cur</th><th className="p-1">Denom</th><th className="p-1">Medium</th><th className="p-1">₦/unit</th></tr>
              </thead>
              <tbody>
                {preview.entries.map((e: any, i: number) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="p-1">{e.cardType}</td>
                    <td className="p-1">{e.country}</td>
                    <td className="p-1">{e.currency}</td>
                    <td className="p-1">{e.minDenom ?? "any"}–{e.maxDenom ?? "any"}</td>
                    <td className="p-1">{e.medium}</td>
                    <td className="p-1">{e.nairaPerUnit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Imported {result.summary.rates} rates across {result.summary.cardTypes} card types.
        </div>
      )}
    </div>
  );
}

function CardsSection() {
  const [cards, setCards] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const { sync } = useNoOnesSyncState();

  async function load() {
    const d = await api("/admin/cards");
    setCards(d.cards);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCard() {
    const name = prompt("Card type name");
    if (!name) return;
    await api("/admin/cards", { body: { name } });
    load();
  }

  async function syncFromNoones(cardId: string) {
    setSyncMsg(null);
    try {
      await api(`/admin/card-types/${cardId}/sync-rates`, { method: "POST" });
      setSyncMsg("Card sync started — see NoOnes synchronization panel for progress.");
    } catch (e) {
      setSyncMsg((e as Error).message);
    }
  }

  async function deleteCard(card: { id: string; name: string }) {
    if (!confirm(`Delete "${card.name}" and all its rates? This cannot be undone.`)) return;
    setSyncMsg(null);
    try {
      await api(`/admin/cards/${card.id}`, { method: "DELETE" });
      if (expanded === card.id) setExpanded(null);
      await load();
      setSyncMsg(`Deleted ${card.name}.`);
    } catch (e) {
      setSyncMsg((e as Error).message);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Card types</h3>
        <button onClick={addCard} className="btn-ghost text-sm">Add card type</button>
      </div>
      {syncMsg ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{syncMsg}</p>
      ) : null}
      <div className="mt-4 divide-y divide-slate-100">
        {cards.map((c) => (
          <div key={c.id}>
            <div className="flex w-full items-center justify-between gap-2 py-3">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="font-medium">{c.name} <span className="text-slate-400">/{c.sellSlug}</span></span>
                <span className="ml-2 text-sm text-slate-500">{c.rateCount} rates {expanded === c.id ? "▲" : "▼"}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                {c.noonesPaymentMethod ? (
                  <button
                    type="button"
                    disabled={sync.running}
                    onClick={() => syncFromNoones(c.id)}
                    className="btn-ghost text-xs"
                  >
                    {sync.running && sync.scope === "card" && sync.cardTypeId === c.id
                      ? "Syncing…"
                      : sync.running && sync.scope === "full"
                        ? "Sync in progress…"
                        : "Sync from NoOnes"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={sync.running}
                  onClick={() => deleteCard(c)}
                  className="btn-ghost text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            {expanded === c.id && <RateEditor cardId={c.id} onChange={load} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function RateEditor({ cardId, onChange }: { cardId: string; onChange: () => void }) {
  const [rates, setRates] = useState<any[]>([]);

  async function load() {
    const d = await api(`/admin/cards/${cardId}/rates`);
    setRates(d.rates);
  }

  useEffect(() => {
    load();
  }, [cardId]);

  async function updateRate(id: string, nairaPerUnit: number) {
    await api(`/admin/rates/${id}`, { method: "PATCH", body: { nairaPerUnit } });
    load();
    onChange();
  }

  async function del(id: string) {
    if (!confirm("Delete this rate?")) return;
    await api(`/admin/rates/${id}`, { method: "DELETE" });
    load();
    onChange();
  }

  return (
    <div className="pb-4">
      <table className="w-full text-xs">
        <thead className="text-left text-slate-500">
          <tr><th className="p-1">Country</th><th className="p-1">Cur</th><th className="p-1">Denom</th><th className="p-1">Medium</th><th className="p-1">₦/unit</th><th></th></tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="p-1">{r.country}</td>
              <td className="p-1">{r.currency}</td>
              <td className="p-1">{r.minDenom ?? "any"}–{r.maxDenom ?? "any"}</td>
              <td className="p-1">{r.medium}</td>
              <td className="p-1">
                <input
                  className="w-24 rounded border border-slate-300 px-2 py-1"
                  defaultValue={r.nairaPerUnit}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v && v !== r.nairaPerUnit) updateRate(r.id, v);
                  }}
                />
              </td>
              <td className="p-1"><button onClick={() => del(r.id)} className="text-red-600">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: any; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" step="any" className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
