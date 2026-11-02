import { Prisma } from "@prisma/client";
import { env } from "../env";
import { prisma } from "../prisma";

/**
 * Official USD/NGN from the Central Bank of Nigeria, which sets the platform's
 * NGN-per-USDT figure (USDT tracks the dollar) less an admin-set reduction.
 *
 * The CBN's public endpoint returns its whole rate history (~8 MB, newest
 * first), so the scheduler reads it twice a day, not per request.
 */

const FETCH_TIMEOUT_MS = 60_000;
const REFRESH_EVERY_MS = 12 * 3_600_000;
const BOOT_DELAY_MS = 20_000;
const STATE_ID = "singleton";

interface CbnRate {
  currency?: string;
  ratedate?: string;
  centralrate?: string | number;
}

export interface OfficialUsdNgn {
  ngnPerUsd: number;
  rateDate: string;
  source: string;
}

export async function fetchOfficialUsdNgn(): Promise<OfficialUsdNgn> {
  const res = await fetch(env.fx.cbnRatesUrl, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; GiftCard4Sale/1.0) fx-sync" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`CBN rates responded ${res.status}`);
  const rows = (await res.json()) as CbnRate[];
  if (!Array.isArray(rows)) throw new Error("CBN rates returned an unexpected payload");

  let latest: { rate: number; date: string } | null = null;
  for (const row of rows) {
    if (String(row.currency ?? "").trim().toUpperCase() !== "US DOLLAR") continue;
    const rate = Number(row.centralrate);
    const date = String(row.ratedate ?? "");
    if (!(rate > 0) || !date) continue;
    if (!latest || date > latest.date) latest = { rate, date };
  }
  if (!latest) throw new Error("CBN rates list no US DOLLAR central rate");
  return { ngnPerUsd: latest.rate, rateDate: latest.date, source: "CBN central rate" };
}

/** Official rate less the admin reduction — the NGN-per-USDT the platform uses. */
export function ngnPerUsdtFromOfficial(ngnPerUsd: number, reductionPercent: number): number {
  const pct = Math.min(Math.max(Number(reductionPercent) || 0, 0), 100);
  return Math.round(ngnPerUsd * (1 - pct / 100) * 100) / 100;
}

export async function getFxRateState() {
  const state = await prisma.fxRateState.findUnique({ where: { id: STATE_ID } });
  return {
    ngnPerUsd: state?.ngnPerUsd != null ? Number(state.ngnPerUsd) : null,
    rateDate: state?.rateDate ?? null,
    source: state?.source ?? null,
    fetchedAt: state?.fetchedAt?.toISOString() ?? null,
    lastAttemptAt: state?.lastAttemptAt?.toISOString() ?? null,
    lastError: state?.lastError ?? null,
  };
}

/**
 * Fetch the official rate and, while auto-sync is on, write the reduced figure
 * into the current config row. Updated in place rather than appended: config
 * rows are the admin's save history, and a twice-daily row would bury it.
 */
export async function refreshNgnPerUsdt(): Promise<{ official: OfficialUsdNgn; ngnPerUsdt: number | null }> {
  const now = new Date();
  try {
    const official = await fetchOfficialUsdNgn();
    await prisma.fxRateState.upsert({
      where: { id: STATE_ID },
      create: {
        id: STATE_ID,
        ngnPerUsd: new Prisma.Decimal(official.ngnPerUsd),
        rateDate: official.rateDate,
        source: official.source,
        fetchedAt: now,
        lastAttemptAt: now,
      },
      update: {
        ngnPerUsd: new Prisma.Decimal(official.ngnPerUsd),
        rateDate: official.rateDate,
        source: official.source,
        fetchedAt: now,
        lastAttemptAt: now,
        lastError: null,
      },
    });

    const cfg = await prisma.rateConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!cfg?.ngnPerUsdtAutoSync) return { official, ngnPerUsdt: null };
    const ngnPerUsdt = ngnPerUsdtFromOfficial(official.ngnPerUsd, cfg.ngnPerUsdtReductionPercent);
    if (Number(cfg.ngnPerUsdt) !== ngnPerUsdt) {
      await prisma.rateConfig.update({ where: { id: cfg.id }, data: { ngnPerUsdt: new Prisma.Decimal(ngnPerUsdt) } });
    }
    return { official, ngnPerUsdt };
  } catch (err) {
    const message = (err as Error).message;
    await prisma.fxRateState
      .upsert({
        where: { id: STATE_ID },
        create: { id: STATE_ID, lastAttemptAt: now, lastError: message },
        update: { lastAttemptAt: now, lastError: message },
      })
      .catch(() => undefined);
    throw err;
  }
}

let fxTimer: ReturnType<typeof setTimeout> | null = null;

const RETRY_AFTER_FAILURE_MS = 3_600_000;

async function onFxWake(): Promise<void> {
  let nextMs = REFRESH_EVERY_MS;
  try {
    const state = await prisma.fxRateState.findUnique({ where: { id: STATE_ID } });
    const sinceFetch = state?.fetchedAt ? Date.now() - state.fetchedAt.getTime() : Infinity;
    if (sinceFetch >= REFRESH_EVERY_MS - 60_000) {
      const { official, ngnPerUsdt } = await refreshNgnPerUsdt();
      console.log(
        `CBN USD/NGN ${official.ngnPerUsd} (${official.rateDate})` +
          (ngnPerUsdt != null ? ` -> NGN per USDT ${ngnPerUsdt}` : " (auto-sync off; figure unchanged)")
      );
    } else {
      // A restart mid-cycle keeps the 12-hour cadence of the last fetch.
      nextMs = REFRESH_EVERY_MS - sinceFetch;
    }
  } catch (err) {
    console.warn("CBN USD/NGN refresh:", (err as Error).message);
    nextMs = RETRY_AFTER_FAILURE_MS;
  }
  fxTimer = setTimeout(() => void onFxWake(), nextMs);
}

/**
 * Twice daily (every 12 hours). On boot, refreshes only when the last fetch is
 * older than that, so deploys and restarts don't refetch the 8 MB feed.
 */
export function startFxRateScheduler(): void {
  if (fxTimer || !env.fx.enabled) return;
  fxTimer = setTimeout(() => void onFxWake(), BOOT_DELAY_MS);
}
