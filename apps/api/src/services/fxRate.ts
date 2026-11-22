import { Prisma } from "@prisma/client";
import { env } from "../env";
import { prisma } from "../prisma";

/**
 * Official USD/NGN from the Central Bank of Nigeria, which sets the platform's
 * NGN-per-USDT figure (USDT tracks the dollar) less an admin-set reduction, and
 * official GHS/NGN from the Bank of Ghana, which sets the platform's
 * NGN-per-Cedi figure plus an admin-set increment.
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

export interface OfficialGhsNgn {
  ngnPerGhs: number;
  rateDate: string;
  source: string;
}

interface BogRatesTable {
  recordsFiltered?: string | number;
  data?: string[][];
}

const BOG_TABLE_ID = "31";

/**
 * Official GHS/NGN from the Bank of Ghana's daily interbank rates — the GHSNGN
 * mid rate, which becomes the platform's NGN-per-Cedi figure plus an admin-set
 * increment. The BoG table is a wpDataTables server-side feed: the page must be
 * fetched first for its per-table nonce, then admin-ajax is POSTed the usual
 * DataTables params. CBN publishes no cedi rate, so the BoG is the official
 * source for this pair.
 */
export async function fetchOfficialGhsNgn(): Promise<OfficialGhsNgn> {
  const pageRes = await fetch(env.fx.bogRatesUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GiftCard4Sale/1.0) fx-sync" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!pageRes.ok) throw new Error(`BoG rates page responded ${pageRes.status}`);
  const html = await pageRes.text();
  const nonce = html.match(
    new RegExp(`wdtNonceFrontendServerSide_${BOG_TABLE_ID}"[^>]*value="([0-9a-f]+)"`)
  )?.[1];
  if (!nonce) throw new Error("BoG rates page has no table nonce");

  const ajaxUrl = new URL("/wp-admin/admin-ajax.php", env.fx.bogRatesUrl);
  ajaxUrl.searchParams.set("action", "get_wdtable");
  ajaxUrl.searchParams.set("table_id", BOG_TABLE_ID);

  const body = new URLSearchParams();
  body.set("draw", "1");
  // Column order on the BoG interbank table: date, currency, pair, bid, offer, mid.
  const cols = ["dt_date", "ds_currency", "cd_currency_pair", "vl_bid", "vl_offer", "vl_mid"];
  cols.forEach((name, i) => {
    body.set(`columns[${i}][data]`, String(i));
    body.set(`columns[${i}][name]`, name);
    body.set(`columns[${i}][searchable]`, "true");
    body.set(`columns[${i}][orderable]`, "true");
    body.set(`columns[${i}][search][value]`, name === "cd_currency_pair" ? "GHSNGN" : "");
    body.set(`columns[${i}][search][regex]`, "false");
  });
  body.set("order[0][column]", "0");
  body.set("order[0][dir]", "desc");
  body.set("start", "0");
  body.set("length", "5");
  body.set("search[value]", "");
  body.set("search[regex]", "false");
  body.set("wdtNonce", nonce);

  const res = await fetch(ajaxUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (compatible; GiftCard4Sale/1.0) fx-sync",
    },
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`BoG rates table responded ${res.status}`);
  const table = (await res.json()) as BogRatesTable;
  const row = table.data?.find((r) => String(r[2] ?? "").trim().toUpperCase() === "GHSNGN");
  const mid = Number(row?.[5]);
  if (!row || !(mid > 0) || !row[0]) throw new Error("BoG rates table lists no GHSNGN mid rate");
  return { ngnPerGhs: mid, rateDate: String(row[0]).trim(), source: "Bank of Ghana interbank mid rate" };
}

/** Official rate less the admin reduction — the NGN-per-USDT the platform uses. */
export function ngnPerUsdtFromOfficial(ngnPerUsd: number, reductionPercent: number): number {
  const pct = Math.min(Math.max(Number(reductionPercent) || 0, 0), 100);
  return Math.round(ngnPerUsd * (1 - pct / 100) * 100) / 100;
}

/** Official rate plus the admin increment — the NGN-per-Cedi the platform uses. */
export function ngnPerGhsFromOfficial(ngnPerGhs: number, incrementPercent: number): number {
  const pct = Math.min(Math.max(Number(incrementPercent) || 0, 0), 500);
  return Math.round(ngnPerGhs * (1 + pct / 100) * 100) / 100;
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
    ngnPerGhs: state?.ngnPerGhs != null ? Number(state.ngnPerGhs) : null,
    ghsRateDate: state?.ghsRateDate ?? null,
    ghsSource: state?.ghsSource ?? null,
    ghsFetchedAt: state?.ghsFetchedAt?.toISOString() ?? null,
    ghsLastAttemptAt: state?.ghsLastAttemptAt?.toISOString() ?? null,
    ghsLastError: state?.ghsLastError ?? null,
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

/**
 * Same as refreshNgnPerUsdt but for the cedi: fetch the BoG GHSNGN mid rate and,
 * while auto-sync is on, write the official figure plus the admin increment.
 */
export async function refreshNgnPerGhs(): Promise<{ official: OfficialGhsNgn; ngnPerGhs: number | null }> {
  const now = new Date();
  try {
    const official = await fetchOfficialGhsNgn();
    await prisma.fxRateState.upsert({
      where: { id: STATE_ID },
      create: {
        id: STATE_ID,
        ngnPerGhs: new Prisma.Decimal(official.ngnPerGhs),
        ghsRateDate: official.rateDate,
        ghsSource: official.source,
        ghsFetchedAt: now,
        ghsLastAttemptAt: now,
      },
      update: {
        ngnPerGhs: new Prisma.Decimal(official.ngnPerGhs),
        ghsRateDate: official.rateDate,
        ghsSource: official.source,
        ghsFetchedAt: now,
        ghsLastAttemptAt: now,
        ghsLastError: null,
      },
    });

    const cfg = await prisma.rateConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!cfg?.ngnPerGhsAutoSync) return { official, ngnPerGhs: null };
    const ngnPerGhs = ngnPerGhsFromOfficial(official.ngnPerGhs, cfg.ngnPerGhsIncrementPercent);
    if (Number(cfg.ngnPerGhs) !== ngnPerGhs) {
      await prisma.rateConfig.update({ where: { id: cfg.id }, data: { ngnPerGhs: new Prisma.Decimal(ngnPerGhs) } });
    }
    return { official, ngnPerGhs };
  } catch (err) {
    const message = (err as Error).message;
    await prisma.fxRateState
      .upsert({
        where: { id: STATE_ID },
        create: { id: STATE_ID, ghsLastAttemptAt: now, ghsLastError: message },
        update: { ghsLastAttemptAt: now, ghsLastError: message },
      })
      .catch(() => undefined);
    throw err;
  }
}

/**
 * Refresh both official rates. Each leg is independent: a failed fetch records
 * its own error and does not stop the other leg. Throws a combined message if
 * either failed so callers can surface it.
 */
export async function refreshFxRates(): Promise<{
  usd: { official: OfficialUsdNgn; ngnPerUsdt: number | null } | { error: string };
  ghs: { official: OfficialGhsNgn; ngnPerGhs: number | null } | { error: string };
}> {
  const [usd, ghs] = await Promise.allSettled([refreshNgnPerUsdt(), refreshNgnPerGhs()]);
  const errors: string[] = [];
  const out = {
    usd:
      usd.status === "fulfilled"
        ? usd.value
        : (errors.push(`CBN: ${(usd.reason as Error).message}`), { error: (usd.reason as Error).message }),
    ghs:
      ghs.status === "fulfilled"
        ? ghs.value
        : (errors.push(`BoG: ${(ghs.reason as Error).message}`), { error: (ghs.reason as Error).message }),
  };
  if (errors.length) throw Object.assign(new Error(errors.join(" · ")), { partial: out });
  return out;
}

let fxTimer: ReturnType<typeof setTimeout> | null = null;

const RETRY_AFTER_FAILURE_MS = 3_600_000;

function describeFxRefresh(rates: Awaited<ReturnType<typeof refreshFxRates>>): string {
  const usdPart =
    "official" in rates.usd
      ? `CBN USD/NGN ${rates.usd.official.ngnPerUsd} (${rates.usd.official.rateDate})` +
        (rates.usd.ngnPerUsdt != null ? ` -> NGN per USDT ${rates.usd.ngnPerUsdt}` : " (auto-sync off)")
      : `CBN failed: ${rates.usd.error}`;
  const ghsPart =
    "official" in rates.ghs
      ? `BoG GHS/NGN ${rates.ghs.official.ngnPerGhs} (${rates.ghs.official.rateDate})` +
        (rates.ghs.ngnPerGhs != null ? ` -> NGN per GHS ${rates.ghs.ngnPerGhs}` : " (auto-sync off)")
      : `BoG failed: ${rates.ghs.error}`;
  return `${usdPart} · ${ghsPart}`;
}

async function onFxWake(): Promise<void> {
  let nextMs = REFRESH_EVERY_MS;
  try {
    const state = await prisma.fxRateState.findUnique({ where: { id: STATE_ID } });
    const sinceFetch = Math.min(
      state?.fetchedAt ? Date.now() - state.fetchedAt.getTime() : Infinity,
      state?.ghsFetchedAt ? Date.now() - state.ghsFetchedAt.getTime() : Infinity
    );
    if (sinceFetch >= REFRESH_EVERY_MS - 60_000) {
      try {
        console.log(describeFxRefresh(await refreshFxRates()));
      } catch (err) {
        // refreshFxRates throws when a leg fails but keeps the other leg's state.
        const partial = (err as { partial?: Awaited<ReturnType<typeof refreshFxRates>> }).partial;
        if (partial) console.log(describeFxRefresh(partial));
        throw err;
      }
    } else {
      // A restart mid-cycle keeps the 12-hour cadence of the last fetch.
      nextMs = REFRESH_EVERY_MS - sinceFetch;
    }
  } catch (err) {
    console.warn("FX rate refresh:", (err as Error).message);
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
