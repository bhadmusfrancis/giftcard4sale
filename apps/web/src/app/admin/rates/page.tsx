"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { RateSyncPanel } from "@/components/RateSyncPanel";
import { RateSyncProvider, useRateSyncState } from "@/components/RateSyncContext";

export default function AdminRatesPage() {
  const [cardsKey, setCardsKey] = useState(0);

  return (
    <RateSyncProvider>
      <div className="space-y-5 sm:space-y-8">
        <h2 className="page-title">Rates &amp; cards</h2>
        <RateSyncPanel onSyncFinished={() => setCardsKey((k) => k + 1)} />
        <ConfigSection onCardsChanged={() => setCardsKey((k) => k + 1)} />
        <ImportSection />
        <CardsSection key={cardsKey} />
      </div>
    </RateSyncProvider>
  );
}

function ConfigSection({ onCardsChanged }: { onCardsChanged?: () => void }) {
  const [config, setConfig] = useState<any>(null);
  const [fx, setFx] = useState<any>(null);
  const { busy: saving, status, run, statusRef } = useAsyncAction();
  const fxAction = useAsyncAction({ scrollOnStatus: false });

  useEffect(() => {
    api("/admin/config").then((d) => {
      setConfig(d.config);
      setFx(d.fx ?? null);
    });
  }, []);

  async function refreshFx() {
    await fxAction.run(async () => {
      const d = await api("/admin/fx/refresh", { method: "POST" });
      if (d.config) setConfig(d.config);
      if (d.fx) setFx(d.fx);
      return d;
    }, (d: any) => `CBN rate ₦${d.fx?.ngnPerUsd} (${d.fx?.rateDate}) fetched.`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    await run(async () => {
      const d = await api("/admin/config", {
        method: "PUT",
        body: {
          ngnPerUsdt: Number(config.rates.ngnPerUsdt),
          ngnPerGhs: Number(config.rates.ngnPerGhs),
          nairaReductionPercent: Number(config.reductions.nairaReductionPercent),
          usdtReductionPercent: Number(config.reductions.usdtReductionPercent),
          ghsReductionPercent: Number(config.reductions.ghsReductionPercent),
          referralPercent: Number(config.referralPercent),
          noonesRateRefreshHours: Number(config.noonesRateRefreshHours ?? 1),
          defaultMaxConcurrentTrades: Number(config.defaultMaxConcurrentTrades ?? 5),
          autoSuspendRejectThreshold: Number(config.autoSuspendRejectThreshold ?? 5),
          autoSuspendRejectWindowDays: Number(config.autoSuspendRejectWindowDays ?? 30),
          autoSuspendDurationDays: Number(config.autoSuspendDurationDays ?? 7),
          minWithdrawalNgn: Number(config.minWithdrawals?.NGN ?? 5000),
          minWithdrawalGhs: Number(config.minWithdrawals?.GHS ?? 50),
          minWithdrawalUsdt: Number(config.minWithdrawals?.USDT ?? 5),
          noonesAutoResellEnabled: config.noonesAutoResellEnabled !== false,
          sttMinOfferOwners: Number(config.sttMinOfferOwners ?? 3),
          sttRecommendedSellers: Number(config.sttRecommendedSellers ?? 10),
          sttEcodeReductionPercent: Number(config.sttEcodeReductionPercent ?? 20),
          euroAppleOddDenomReductionPercent: Number(config.euroAppleOddDenomReductionPercent ?? 15),
          sogoMaxGapPercent: Number(config.sogoMaxGapPercent ?? 25),
          sttFallbackReductionPercent: Number(config.sttFallbackReductionPercent ?? 15),
          ngnPerUsdtAutoSync: config.ngnPerUsdtAutoSync !== false,
          ngnPerUsdtReductionPercent: Number(config.ngnPerUsdtReductionPercent ?? 8),
          maxBankAccounts: Number(config.maxBankAccounts ?? 5),
          maxMomoAccounts: Number(config.maxMomoAccounts ?? 5),
        },
      });
      if (d.config) setConfig(d.config);
      if (d.fx) setFx(d.fx);
      if (d.autoResellOverrideApplied || d.cardDeductionsReset) onCardsChanged?.();
      return d;
    }, () => "Config saved successfully.");
  }

  if (!config) return null;

  return (
    <form onSubmit={save} className="card p-4 sm:p-6">
      <h3 className="font-bold">Exchange rates &amp; deductions</h3>
      <p className="mt-1 text-sm text-slate-500">
        Used to convert Naira card value to USDT/Cedi and to deduct the margin. Gift-card buy rates sync from
        sogo.africa/rates on the refresh interval below; brands Sogo does not list use last traded rates from
        contacted partners.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        <Field label="NGN per 1 USDT" value={config.rates.ngnPerUsdt} onChange={(v) => setConfig({ ...config, rates: { ...config.rates, ngnPerUsdt: v } })} />
        <Field
          label="NGN per USDT reduction % (off CBN rate)"
          value={config.ngnPerUsdtReductionPercent ?? 8}
          onChange={(v) => setConfig({ ...config, ngnPerUsdtReductionPercent: v })}
        />
        <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.ngnPerUsdtAutoSync !== false}
              onChange={(e) => setConfig({ ...config, ngnPerUsdtAutoSync: e.target.checked })}
            />
            <span>
              <span className="font-medium text-slate-800">Auto-update NGN per USDT from the CBN twice daily</span>
              <span className="mt-1 block text-slate-500">
                Every 12 hours, NGN per USDT is set to the Central Bank of Nigeria&apos;s official USD/NGN central rate
                less the reduction % above. You can still type a figure — it applies until the next refresh. Turn this
                off to keep a manual figure.
              </span>
            </span>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-slate-600">
            <span>
              {fx?.ngnPerUsd
                ? `CBN official: ₦${Number(fx.ngnPerUsd).toLocaleString()} (${fx.rateDate}) → ₦${(
                    Number(fx.ngnPerUsd) *
                    (1 - Number(config.ngnPerUsdtReductionPercent ?? 8) / 100)
                  ).toLocaleString(undefined, { maximumFractionDigits: 2 })} per USDT · fetched ${new Date(
                    fx.fetchedAt
                  ).toLocaleString()}`
                : "CBN official rate not fetched yet."}
              {fx?.lastError ? ` · last attempt failed: ${fx.lastError}` : ""}
            </span>
            <button type="button" onClick={refreshFx} className="btn-ghost px-3 py-1.5 text-xs" disabled={fxAction.busy}>
              {fxAction.busy ? "Fetching…" : "Fetch CBN rate now"}
            </button>
          </div>
          <FormFeedback status={fxAction.status} anchorRef={fxAction.statusRef} />
        </div>
        <Field label="NGN per 1 GHS (Cedi)" value={config.rates.ngnPerGhs} onChange={(v) => setConfig({ ...config, rates: { ...config.rates, ngnPerGhs: v } })} />
        <Field label="Referral %" value={config.referralPercent} onChange={(v) => setConfig({ ...config, referralPercent: v })} />
        <Field label="Naira deduction %" value={config.reductions.nairaReductionPercent} onChange={(v) => setConfig({ ...config, reductions: { ...config.reductions, nairaReductionPercent: v } })} />
        <Field label="USDT deduction %" value={config.reductions.usdtReductionPercent} onChange={(v) => setConfig({ ...config, reductions: { ...config.reductions, usdtReductionPercent: v } })} />
        <Field label="Cedi deduction %" value={config.reductions.ghsReductionPercent} onChange={(v) => setConfig({ ...config, reductions: { ...config.reductions, ghsReductionPercent: v } })} />
        <Field
          label="Rate refresh interval (hours)"
          value={config.noonesRateRefreshHours ?? 1}
          onChange={(v) => setConfig({ ...config, noonesRateRefreshHours: v })}
        />
        <Field
          label="Min SafeTheTrade sellers per rate"
          value={config.sttMinOfferOwners ?? 3}
          onChange={(v) => setConfig({ ...config, sttMinOfferOwners: v })}
        />
        <Field
          label="Top recommended SafeTheTrade sellers per rate"
          value={config.sttRecommendedSellers ?? 10}
          onChange={(v) => setConfig({ ...config, sttRecommendedSellers: v })}
        />
        <Field
          label="E-code deduction % (no e-code offers)"
          value={config.sttEcodeReductionPercent ?? 20}
          onChange={(v) => setConfig({ ...config, sttEcodeReductionPercent: v })}
        />
        <Field
          label="Drop Sogo when this % below SafeTheTrade"
          value={config.sogoMaxGapPercent ?? 25}
          onChange={(v) => setConfig({ ...config, sogoMaxGapPercent: v })}
        />
        <Field
          label="Never quote below SafeTheTrade less %"
          value={config.sttFallbackReductionPercent ?? 15}
          onChange={(v) => setConfig({ ...config, sttFallbackReductionPercent: v })}
        />
        <Field
          label="Euro Apple odd-denomination deduction %"
          value={config.euroAppleOddDenomReductionPercent ?? 15}
          onChange={(v) => setConfig({ ...config, euroAppleOddDenomReductionPercent: v })}
        />
        <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={config.noonesAutoResellEnabled !== false}
              onChange={(e) => setConfig({ ...config, noonesAutoResellEnabled: e.target.checked })}
            />
            <span>
              <span className="font-medium text-slate-800">Background auto-resell on SafeTheTrade</span>
              <span className="mt-1 block text-slate-500">
                When enabled, new trades are automatically opened on SafeTheTrade (greeting, receipt upload when
                required, then card/code delivery only after the partner asks for it). When disabled, trades stay
                pending for manual admin review; you can still start the resale from a trade detail page. Changing
                this toggle resets every card&apos;s &quot;Auto-trade&quot; checkbox to match — adjust individual cards
                afterwards to choose which gift cards participate.
              </span>
            </span>
          </label>
        </div>
        <Field
          label="Default max active trades"
          value={config.defaultMaxConcurrentTrades ?? 5}
          onChange={(v) => setConfig({ ...config, defaultMaxConcurrentTrades: v })}
        />
        <Field
          label="Max bank accounts per user"
          value={config.maxBankAccounts ?? 5}
          onChange={(v) => setConfig({ ...config, maxBankAccounts: v })}
        />
        <Field
          label="Max MoMo accounts per user"
          value={config.maxMomoAccounts ?? 5}
          onChange={(v) => setConfig({ ...config, maxMomoAccounts: v })}
        />
        <Field
          label="Auto-suspend after rejections"
          value={config.autoSuspendRejectThreshold ?? 5}
          onChange={(v) => setConfig({ ...config, autoSuspendRejectThreshold: v })}
        />
        <Field
          label="Rejection window (days)"
          value={config.autoSuspendRejectWindowDays ?? 30}
          onChange={(v) => setConfig({ ...config, autoSuspendRejectWindowDays: v })}
        />
        <Field
          label="Auto-suspend duration (days)"
          value={config.autoSuspendDurationDays ?? 7}
          onChange={(v) => setConfig({ ...config, autoSuspendDurationDays: v })}
        />
        <Field
          label="Min withdrawal — Naira (₦)"
          value={config.minWithdrawals?.NGN ?? 5000}
          onChange={(v) =>
            setConfig({
              ...config,
              minWithdrawals: { ...(config.minWithdrawals ?? {}), NGN: v },
            })
          }
        />
        <Field
          label="Min withdrawal — Cedi (GHS)"
          value={config.minWithdrawals?.GHS ?? 50}
          onChange={(v) =>
            setConfig({
              ...config,
              minWithdrawals: { ...(config.minWithdrawals ?? {}), GHS: v },
            })
          }
        />
        <Field
          label="Min withdrawal — USDT"
          value={config.minWithdrawals?.USDT ?? 5}
          onChange={(v) =>
            setConfig({
              ...config,
              minWithdrawals: { ...(config.minWithdrawals ?? {}), USDT: v },
            })
          }
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        A country/currency tier is shown in the catalog only when it has at least this many live NoOnes buy offers.
        A SafeTheTrade rate is quoted on its own only when at least this many distinct sellers back it. When none of
        a card&apos;s SafeTheTrade offers say they accept e-codes, its e-code rate is the physical rate less the e-code
        deduction %. The lower of SafeTheTrade and Sogo wins, except that a Sogo rate more than the &quot;drop
        Sogo&quot; % below SafeTheTrade&apos;s is ignored, and no rate is ever quoted below SafeTheTrade less the
        &quot;never quote below&quot; %. An e-code never pays more than the physical
        card. Minimum
        withdrawal amounts apply to user wallet send/withdraw requests. The odd-denomination deduction applies on
        top of the payout deduction when a Euro Apple/iTunes amount is not a multiple of 5 or 50. Changing a
        deduction % resets every card&apos;s per-card override back to the platform default — adjust individual
        cards afterwards.
      </p>
      <div className="mt-4 space-y-3">
        {saving && !status ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Saving configuration…
          </div>
        ) : null}
        <FormFeedback status={status} anchorRef={statusRef} />
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
          {saving ? "Saving…" : "Save config"}
        </button>
      </div>
    </form>
  );
}

function ImportSection() {
  const [text, setText] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const previewAction = useAsyncAction({ scrollOnStatus: false });
  const importAction = useAsyncAction({ scrollOnStatus: false });
  const feedbackRef = useRef<HTMLDivElement>(null);

  async function doPreview() {
    await previewAction.run(async () => {
      const d = await api("/admin/rates/parse", { body: { text } });
      setPreview(d);
      return d;
    }, () => "Preview ready.");
  }

  async function doImport() {
    await importAction.run(async () => {
      const result = await api("/admin/rates/import", { body: { text, replaceExisting } });
      setPreview(null);
      return result;
    }, (result) =>
      `Imported ${result.summary.rates} rates across ${result.summary.cardTypes} card types.`
    );
  }

  const status = importAction.status ?? previewAction.status;

  useEffect(() => {
    if (status && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [status]);

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="font-bold">Paste rate text (Naira format)</h3>
      <p className="mt-1 text-sm text-slate-500">
        Paste the rate list. The system deducts the configured Naira, USDT, and Cedi percentages, ignores &quot;in Ns&quot;, and always
        uses the SLOW rate.
      </p>
      <textarea className="input mt-3 min-h-[200px] font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="===【Apple/iTunes】SLOW ===&#10;● US (200-500 in 100s) = 1092 ..." />
      <div className="mt-3 grid grid-cols-2 items-center gap-3 sm:flex sm:flex-wrap">
        <label className="col-span-2 flex items-center gap-2 text-sm sm:order-2">
          <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
          Replace existing rates for these card types
        </label>
        <button type="button" onClick={doPreview} className="btn-ghost sm:order-1" disabled={!text || previewAction.busy || importAction.busy}>
          {previewAction.busy ? "Previewing…" : "Preview parse"}
        </button>
        <button type="button" onClick={doImport} className="btn-primary sm:order-3" disabled={!text || previewAction.busy || importAction.busy}>
          {importAction.busy ? "Importing…" : "Import"}
        </button>
      </div>

      <FormFeedback status={status} anchorRef={feedbackRef} className="mt-4" />

      {preview && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="font-semibold">{preview.entries.length} rate rows parsed</p>
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="w-full min-w-[30rem] text-xs">
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

    </div>
  );
}

function CardsSection() {
  const [cards, setCards] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const { sync } = useRateSyncState();

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

  async function syncCardRates(cardId: string) {
    setSyncMsg(null);
    try {
      await api(`/admin/card-types/${cardId}/sync-rates`, { method: "POST" });
      setSyncMsg("Card sync started — see the rate synchronization panel for progress.");
    } catch (e) {
      setSyncMsg((e as Error).message);
    }
  }

  async function toggleAutoTrade(card: { id: string; noonesAutoResellEnabled?: boolean }) {
    setSyncMsg(null);
    try {
      const enabled = card.noonesAutoResellEnabled === false;
      await api(`/admin/cards/${card.id}`, {
        method: "PATCH",
        body: { noonesAutoResellEnabled: enabled },
      });
      await load();
      setSyncMsg(enabled ? "Auto-trade enabled for this card." : "Auto-trade disabled for this card.");
    } catch (e) {
      setSyncMsg((e as Error).message);
    }
  }

  async function toggleForceActive(card: { id: string; name: string; forceActive?: boolean }) {
    setSyncMsg(null);
    try {
      const enabled = !card.forceActive;
      await api(`/admin/cards/${card.id}`, { method: "PATCH", body: { forceActive: enabled } });
      await load();
      setSyncMsg(
        enabled
          ? `${card.name} is now listed on /cards even without an active rate.`
          : `${card.name} is listed on /cards only while it has an active rate.`
      );
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
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">
          Card types <span className="text-sm font-normal text-slate-400">({cards.length})</span>
        </h3>
        <button onClick={addCard} className="btn-ghost py-2 text-sm">+ Add card</button>
      </div>
      {syncMsg ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{syncMsg}</p>
      ) : null}
      <div className="mt-4 divide-y divide-slate-100">
        {cards.map((c) => (
          <div key={c.id}>
            <div className="flex w-full flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left md:justify-start"
                aria-expanded={expanded === c.id}
              >
                <span className="min-w-0">
                  <span className="block break-words font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-slate-400">/{c.sellSlug}</span>
                  {!c.active && !c.forceActive ? (
                    <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      Hidden — no active rate
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm text-slate-500 md:ml-2">
                  {c.rateCount} rates {expanded === c.id ? "▲" : "▼"}
                </span>
              </button>
              <div className="flex flex-wrap items-center gap-1 md:shrink-0 md:flex-nowrap">
                <label
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600"
                  title="List this card on /cards even when it has no active rate"
                >
                  <input type="checkbox" checked={c.forceActive === true} onChange={() => toggleForceActive(c)} />
                  Always active
                </label>
                <label className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600" title="Auto-open new trades on SafeTheTrade">
                  <input
                    type="checkbox"
                    checked={c.noonesAutoResellEnabled !== false}
                    disabled={sync.running}
                    onChange={() => toggleAutoTrade(c)}
                  />
                  Auto-trade
                </label>
                <button
                  type="button"
                  disabled={sync.running}
                  onClick={() => syncCardRates(c.id)}
                  className="btn-ghost ml-auto px-3 py-1.5 text-xs md:ml-0"
                  title="Sync this card's live rates from SafeTheTrade, then Sogo"
                >
                  {sync.running && sync.scope === "card" && sync.cardTypeId === c.id
                    ? "Syncing…"
                    : sync.running && sync.scope === "full"
                      ? "Sync in progress…"
                      : "Sync rates"}
                </button>
                <button
                  type="button"
                  disabled={sync.running}
                  onClick={() => deleteCard(c)}
                  className="btn-ghost px-3 py-1.5 text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            {expanded === c.id && <RateEditor card={c} onChange={load} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function RateEditor({ card, onChange }: { card: any; onChange: () => void }) {
  const [rates, setRates] = useState<any[]>([]);
  const cardId = card.id;

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

  async function saveDeduction(field: string, raw: string) {
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 100)) return;
    if (value === card[field]) return;
    await api(`/admin/cards/${cardId}`, { method: "PATCH", body: { [field]: value } });
    onChange();
  }

  return (
    <div className="pb-4">
      <div className="mb-3 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-600">
          Deductions for this card <span className="font-normal text-slate-400">(blank = platform default)</span>
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          {(
            [
              ["nairaReductionPercent", "Naira %"],
              ["usdtReductionPercent", "USDT %"],
              ["ghsReductionPercent", "Cedi %"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="flex min-w-0 flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-1.5">
              {label}
              <input
                type="number"
                min={0}
                max={100}
                className="w-full min-w-0 rounded border border-slate-300 px-2 py-1 sm:w-20"
                defaultValue={card[field] ?? ""}
                placeholder="Default"
                onBlur={(e) => saveDeduction(field, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[28rem] text-xs">
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
              <td className="p-1">
                <button
                  onClick={() => del(r.id)}
                  className="grid h-8 w-8 place-items-center rounded text-base text-red-600 hover:bg-red-50"
                  aria-label="Delete rate"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
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
