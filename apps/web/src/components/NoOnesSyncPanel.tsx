"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { useNoOnesSyncState } from "@/components/NoOnesSyncContext";

interface SyncProgress {
  running: boolean;
  phase: string;
  scope: string | null;
  trigger: string | null;
  force: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  elapsedMs: number;
  cardTypeId: string | null;
  currentCard: { id: string; name: string } | null;
  processedCards: number;
  totalCards: number;
  progressPercent: number | null;
  summary: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    drafted: number;
    published: number;
    cardTypes: number;
    errors: string[];
  };
  recentErrors: string[];
  lastError: string | null;
}

interface SyncStatus {
  configured: boolean;
  active: SyncProgress;
  lastCompleted: SyncProgress | null;
  database: {
    noonesCards: number;
    noonesRates: number;
    activeNoonesRates: number;
    latestRateUpdate: string | null;
    staleCards: number;
    refreshHours: number;
  };
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "discovering":
      return "Discovering cards";
    case "syncing":
      return "Syncing rates";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Idle";
  }
}

export function NoOnesSyncPanel({ onSyncFinished }: { onSyncFinished?: () => void }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const startAction = useAsyncAction();
  const [wasRunning, setWasRunning] = useState(false);
  const { setSync } = useNoOnesSyncState();

  const load = useCallback(async (light = false) => {
    try {
      const path = light ? "/admin/noones/sync-status?light=1" : "/admin/noones/sync-status";
      const d = await api<SyncStatus>(path);
      setStatus(d);
      setSync({
        running: d.active.running,
        cardTypeId: d.active.cardTypeId,
        scope: d.active.scope as "full" | "card" | null,
      });
      return d;
    } catch {
      return null;
    }
  }, [setSync]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!status?.active.running) return;
    const t = setInterval(() => load(true), 3000);
    return () => clearInterval(t);
  }, [status?.active.running, load]);

  useEffect(() => {
    const running = status?.active.running ?? false;
    if (wasRunning && !running) {
      onSyncFinished?.();
      void load(false);
    }
    setWasRunning(running);
  }, [status?.active.running, onSyncFinished, wasRunning, load]);

  async function startSync(force: boolean) {
    await startAction.run(async () => {
      await api("/admin/noones/sync-rates", { method: "POST", body: { force } });
      await load();
    }, force ? "Force refresh started." : "Sync started.");
  }

  if (!status) return null;

  const { configured, active, lastCompleted, database } = status;
  const run = active.running ? active : lastCompleted;
  const showRun = active.running || lastCompleted;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">NoOnes synchronization</h3>
          <p className="mt-1 text-sm text-slate-500">
            Pull gift-card catalog and live rates from NoOnes into the database. Runs in the background — this panel
            updates every few seconds while a sync is active.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={!configured || startAction.busy || active.running}
            onClick={() => startSync(false)}
          >
            {active.running ? "Syncing…" : "Sync stale cards"}
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={!configured || startAction.busy || active.running}
            onClick={() => startSync(true)}
          >
            Force refresh all
          </button>
        </div>
      </div>

      {!configured ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          NoOnes is not configured. Set <code className="text-xs">NOONES_ENABLED</code> and API credentials in the
          API environment.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Linked cards" value={database.noonesCards} />
        <Stat label="NoOnes rate rows" value={database.noonesRates} />
        <Stat label="Active rates" value={database.activeNoonesRates} />
        <Stat
          label="Stale cards"
          value={active.running ? "…" : database.staleCards}
          hint={`>${database.refreshHours}h old`}
        />
      </div>

      {database.latestRateUpdate ? (
        <p className="mt-2 text-xs text-slate-500">
          Latest rate in DB: {date(database.latestRateUpdate)}
        </p>
      ) : null}

      {active.running ? (
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-brand-900">
              {phaseLabel(active.phase)}
              {active.scope === "card" ? " (single card)" : " (all cards)"}
            </span>
            <span className="text-slate-600">{formatDuration(active.elapsedMs)}</span>
          </div>

          {active.totalCards > 0 ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>
                  {active.processedCards} / {active.totalCards} cards
                </span>
                <span>{active.progressPercent ?? 0}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${active.progressPercent ?? 0}%` }}
                />
              </div>
            </div>
          ) : null}

          {active.currentCard ? (
            <p className="mt-2 text-sm text-slate-700">
              Current: <span className="font-medium">{active.currentCard.name}</span>
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>{active.summary.created} created</span>
            <span>{active.summary.updated} updated</span>
            <span>{active.summary.deleted} deleted</span>
            <span>{active.summary.skipped} skipped</span>
            <span>{active.summary.published} published</span>
            <span>{active.summary.drafted} drafted</span>
            {active.summary.errors.length > 0 ? (
              <span className="text-amber-700">{active.summary.errors.length} errors</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {showRun && !active.running && lastCompleted ? (
        <div
          className={`mt-4 rounded-lg p-4 text-sm ${
            lastCompleted.phase === "failed"
              ? "bg-red-50 text-red-900"
              : lastCompleted.summary.errors.length
                ? "bg-amber-50 text-amber-900"
                : "bg-emerald-50 text-emerald-900"
          }`}
        >
          <p className="font-semibold">
            Last sync: {phaseLabel(lastCompleted.phase)}
            {lastCompleted.finishedAt ? ` · ${date(lastCompleted.finishedAt)}` : ""}
            {lastCompleted.elapsedMs ? ` · ${formatDuration(lastCompleted.elapsedMs)}` : ""}
          </p>
          <p className="mt-1">
            {lastCompleted.summary.created} created, {lastCompleted.summary.updated} updated,{" "}
            {lastCompleted.summary.deleted} deleted, {lastCompleted.summary.skipped} skipped
            {lastCompleted.summary.errors.length
              ? ` · ${lastCompleted.summary.errors.length} error(s)`
              : ""}
          </p>
          {lastCompleted.lastError ? (
            <p className="mt-1 text-xs opacity-90">Last error: {lastCompleted.lastError}</p>
          ) : null}
        </div>
      ) : null}

      {active.recentErrors.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Recent errors ({active.recentErrors.length})
          </summary>
          <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {active.recentErrors.map((err, i) => (
              <li key={i} className="border-b border-slate-200 py-1 last:border-0">
                {err}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {startAction.status ? (
        <FormFeedback status={startAction.status} anchorRef={startAction.statusRef} className="mt-3" />
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-800">
        {value}
        {hint ? <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span> : null}
      </p>
    </div>
  );
}
