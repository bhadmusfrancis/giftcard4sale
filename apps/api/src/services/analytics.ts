import { prisma } from "../prisma";
import geoip from "geoip-lite";

const RETENTION_DAYS = 90;
const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|preview|headless|wget|curl|python-requests|scrapy/i;

export function isBotUserAgent(ua: string | undefined): boolean {
  if (!ua) return false;
  return BOT_UA.test(ua);
}

export function parseBrowser(ua: string | undefined): string | null {
  if (!ua) return null;
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) return "Safari";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/msie|trident/i.test(ua)) return "IE";
  return "Other";
}

export function normalizePath(raw: string): string | null {
  try {
    const path = raw.trim().split("?")[0].split("#")[0];
    if (!path.startsWith("/")) return null;
    if (path.length > 500) return path.slice(0, 500);
    if (!isPublicTrafficPath(path)) return null;
    return path || "/";
  } catch {
    return null;
  }
}

/** Paths counted in the public traffic report (excludes admin console). */
export function isPublicTrafficPath(path: string): boolean {
  return !path.startsWith("/admin") && !path.startsWith("/_next");
}

export function normalizeReferrer(raw: string | undefined | null, siteHost?: string): string {
  if (!raw || !raw.trim()) return "direct";
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!host) return "direct";
    if (siteHost && (host === siteHost || host.endsWith(`.${siteHost}`))) return "internal";
    return host.slice(0, 200);
  } catch {
    return "direct";
  }
}

/** Resolve ISO 3166-1 alpha-2 country code from a client IP (offline GeoIP lookup). */
export function resolveCountryFromIp(ip: string | undefined): string | null {
  if (!ip?.trim()) return null;
  const normalized = ip.trim().replace(/^::ffff:/i, "");
  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  ) {
    return null;
  }
  const hit = geoip.lookup(normalized);
  const code = hit?.country?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

export type TrafficRange = "24h" | "7d" | "30d" | "90d";
export type TrafficGranularity = "hour" | "day";

export function rangeToDays(range: TrafficRange): number {
  if (range === "24h") return 1;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 7;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcHour(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours())
  );
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hourBucketKey(raw: string | Date): string {
  const value = raw instanceof Date ? raw.toISOString() : String(raw);
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return startOfUtcHour(parsed).toISOString();
  const utcGuess = new Date(`${value.replace(" ", "T")}${value.endsWith("Z") ? "" : "Z"}`);
  if (!Number.isNaN(utcGuess.getTime())) return startOfUtcHour(utcGuess).toISOString();
  return value;
}

function rangeWindow(range: TrafficRange, now = new Date()) {
  if (range === "24h") {
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    return { periodStart, periodEnd, prevStart, granularity: "hour" as const };
  }
  const days = rangeToDays(range);
  const periodEnd = addUtcDays(startOfUtcDay(now), 1);
  const periodStart = addUtcDays(periodEnd, -days);
  const prevStart = addUtcDays(periodStart, -days);
  return { periodStart, periodEnd, prevStart, granularity: "day" as const };
}

type Summary = {
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  avgPagesPerSession: number;
};

async function summarize(from: Date, to: Date): Promise<Summary> {
  const rows = await prisma.$queryRaw<
    Array<{ page_views: bigint; unique_visitors: bigint; sessions: bigint }>
  >`
    SELECT
      COUNT(*)::bigint AS page_views,
      COUNT(DISTINCT "visitorId")::bigint AS unique_visitors,
      COUNT(DISTINCT "sessionId")::bigint AS sessions
    FROM "AnalyticsPageView"
    WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      AND path NOT LIKE '/admin%'
  `;
  const row = rows[0];
  const pageViews = Number(row?.page_views ?? 0);
  const uniqueVisitors = Number(row?.unique_visitors ?? 0);
  const sessions = Number(row?.sessions ?? 0);
  return {
    pageViews,
    uniqueVisitors,
    sessions,
    avgPagesPerSession: sessions > 0 ? Math.round((pageViews / sessions) * 10) / 10 : 0,
  };
}

export async function getLast24hSummary(): Promise<Summary> {
  const now = new Date();
  return summarize(new Date(now.getTime() - 24 * 60 * 60 * 1000), now);
}

export async function getTrafficReport(range: TrafficRange) {
  const { periodStart, periodEnd, prevStart, granularity } = rangeWindow(range);

  const timeseriesQuery =
    granularity === "hour"
      ? prisma.$queryRaw<Array<{ bucket: string; views: bigint; visitors: bigint }>>`
          SELECT
            to_char(
              date_trunc('hour', "createdAt" AT TIME ZONE 'UTC'),
              'YYYY-MM-DD"T"HH24":00:00.000Z"'
            ) AS bucket,
            COUNT(*)::bigint AS views,
            COUNT(DISTINCT "visitorId")::bigint AS visitors
          FROM "AnalyticsPageView"
          WHERE "createdAt" >= ${periodStart} AND "createdAt" < ${periodEnd}
            AND path NOT LIKE '/admin%'
          GROUP BY 1
          ORDER BY 1 ASC
        `
      : prisma.$queryRaw<Array<{ bucket: string; views: bigint; visitors: bigint }>>`
          SELECT
            to_char(
              date_trunc('day', "createdAt" AT TIME ZONE 'UTC'),
              'YYYY-MM-DD'
            ) AS bucket,
            COUNT(*)::bigint AS views,
            COUNT(DISTINCT "visitorId")::bigint AS visitors
          FROM "AnalyticsPageView"
          WHERE "createdAt" >= ${periodStart} AND "createdAt" < ${periodEnd}
            AND path NOT LIKE '/admin%'
          GROUP BY 1
          ORDER BY 1 ASC
        `;

  const [summary, previous, timeseriesRows, topPagesRaw, topReferrersRaw, devicesRaw, countriesRaw] =
    await Promise.all([
      summarize(periodStart, periodEnd),
      summarize(prevStart, periodStart),
      timeseriesQuery,
      prisma.$queryRaw<Array<{ path: string; views: bigint; visitors: bigint }>>`
        SELECT
          path,
          COUNT(*)::bigint AS views,
          COUNT(DISTINCT "visitorId")::bigint AS visitors
        FROM "AnalyticsPageView"
        WHERE "createdAt" >= ${periodStart} AND "createdAt" < ${periodEnd}
          AND path NOT LIKE '/admin%'
        GROUP BY path
        ORDER BY views DESC
        LIMIT 15
      `,
      prisma.$queryRaw<Array<{ referrer: string; views: bigint }>>`
        SELECT
          referrer,
          COUNT(*)::bigint AS views
        FROM "AnalyticsPageView"
        WHERE "createdAt" >= ${periodStart} AND "createdAt" < ${periodEnd}
          AND path NOT LIKE '/admin%'
        GROUP BY referrer
        ORDER BY views DESC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ device: string; views: bigint }>>`
        SELECT
          device,
          COUNT(*)::bigint AS views
        FROM "AnalyticsPageView"
        WHERE "createdAt" >= ${periodStart} AND "createdAt" < ${periodEnd}
          AND path NOT LIKE '/admin%'
        GROUP BY device
        ORDER BY views DESC
      `,
      prisma.$queryRaw<Array<{ country: string | null; views: bigint; visitors: bigint }>>`
        SELECT
          country,
          COUNT(*)::bigint AS views,
          COUNT(DISTINCT "visitorId")::bigint AS visitors
        FROM "AnalyticsPageView"
        WHERE "createdAt" >= ${periodStart} AND "createdAt" < ${periodEnd}
          AND path NOT LIKE '/admin%'
        GROUP BY country
        ORDER BY views DESC
        LIMIT 15
      `,
    ]);

  const byBucket = new Map(
    timeseriesRows.map((r) => [
      granularity === "hour" ? hourBucketKey(r.bucket) : String(r.bucket).slice(0, 10),
      { views: Number(r.views), visitors: Number(r.visitors) },
    ])
  );

  const timeseries =
    granularity === "hour"
      ? Array.from({ length: 24 }, (_, i) => {
          const date = addUtcHours(startOfUtcHour(periodEnd), i - 23).toISOString();
          const hit = byBucket.get(date);
          return { date, views: hit?.views ?? 0, visitors: hit?.visitors ?? 0 };
        })
      : Array.from({ length: rangeToDays(range) }, (_, i) => {
          const date = ymd(addUtcDays(periodStart, i));
          const hit = byBucket.get(date);
          return { date, views: hit?.views ?? 0, visitors: hit?.visitors ?? 0 };
        });

  const topPages = topPagesRaw.map((r) => ({
    path: r.path,
    views: Number(r.views),
    visitors: Number(r.visitors),
  }));

  const topReferrers = topReferrersRaw.map((r) => ({
    referrer: r.referrer,
    views: Number(r.views),
  }));

  const totalDeviceViews = devicesRaw.reduce((a, r) => a + Number(r.views), 0) || 1;
  const devices = devicesRaw.map((r) => {
    const views = Number(r.views);
    return {
      device: r.device,
      views,
      pct: Math.round((views / totalDeviceViews) * 1000) / 10,
    };
  });

  const totalCountryViews =
    countriesRaw.reduce((a, r) => a + Number(r.views), 0) || 1;
  const countries = countriesRaw.map((r) => {
    const views = Number(r.views);
    return {
      country: r.country,
      views,
      visitors: Number(r.visitors),
      pct: Math.round((views / totalCountryViews) * 1000) / 10,
    };
  });

  return {
    range,
    granularity,
    from: periodStart.toISOString(),
    to: periodEnd.toISOString(),
    summary,
    previous,
    timeseries,
    topPages,
    topReferrers,
    devices,
    countries,
  };
}

/** Probabilistic cleanup of old page views (keeps DB bounded). */
export async function maybePurgeOldPageViews(): Promise<void> {
  if (Math.random() > 0.02) return;
  const cutoff = addUtcDays(new Date(), -RETENTION_DAYS);
  await prisma.analyticsPageView.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
