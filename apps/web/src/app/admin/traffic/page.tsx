"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";

type TrafficRange = "7d" | "30d" | "90d";

type TrafficReport = {
  range: TrafficRange;
  from: string;
  to: string;
  summary: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgPagesPerSession: number;
  };
  previous: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgPagesPerSession: number;
  };
  timeseries: Array<{ date: string; views: number; visitors: number }>;
  topPages: Array<{ path: string; views: number; visitors: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  devices: Array<{ device: string; views: number; pct: number }>;
};

const RANGES: Array<{ id: TrafficRange; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

function formatDateLabel(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const pct = deltaPct(current, previous);
  if (pct === null) return <span className="text-xs text-slate-400">vs prior period</span>;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? "↑" : "↓"} {Math.abs(pct)}% vs prior
    </span>
  );
}

function KpiCard({
  label,
  value,
  previous,
  hint,
}: {
  label: string;
  value: number | string;
  previous: number;
  hint: string;
}) {
  const numeric = typeof value === "number" ? value : Number(value);
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-xs text-slate-500 sm:text-sm">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-2">
        <DeltaBadge current={Number.isFinite(numeric) ? numeric : 0} previous={previous} />
      </div>
      <p className="mt-1 hidden text-xs text-slate-400 sm:block">{hint}</p>
    </div>
  );
}

function DeviceBar({ devices }: { devices: TrafficReport["devices"] }) {
  if (!devices.length) {
    return <p className="text-sm text-slate-400">No device data yet.</p>;
  }
  const colors: Record<string, string> = {
    desktop: "bg-brand-600",
    mobile: "bg-sky-500",
    tablet: "bg-amber-500",
  };
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {devices.map((d) => (
          <div
            key={d.device}
            className={`${colors[d.device] || "bg-slate-400"} h-full`}
            style={{ width: `${Math.max(d.pct, 0)}%` }}
            title={`${d.device}: ${d.pct}%`}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {devices.map((d) => (
          <li key={d.device} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 capitalize text-slate-700">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[d.device] || "bg-slate-400"}`} />
              {d.device}
            </span>
            <span className="tabular-nums text-slate-500">
              {d.views.toLocaleString()} · {d.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrafficDashboard() {
  const [range, setRange] = useState<TrafficRange>("7d");
  const [data, setData] = useState<TrafficReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<TrafficReport>(`/admin/analytics/traffic?range=${range}`)
      .then((report) => {
        if (!cancelled) setData(report);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load traffic");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const chartData = useMemo(
    () =>
      (data?.timeseries || []).map((row) => ({
        ...row,
        label: formatDateLabel(row.date),
      })),
    [data]
  );

  const maxViews = Math.max(1, ...chartData.map((r) => r.views));
  const hasTraffic = (data?.summary.pageViews ?? 0) > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Website traffic</h2>
          <p className="mt-1 text-sm text-slate-500">
            First-party page views across the public site (admin visits excluded)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`badge cursor-pointer px-3 py-1.5 text-sm ${
                range === r.id ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Page views"
          value={data?.summary.pageViews ?? (loading ? "—" : 0)}
          previous={data?.previous.pageViews ?? 0}
          hint="Total page loads in range"
        />
        <KpiCard
          label="Unique visitors"
          value={data?.summary.uniqueVisitors ?? (loading ? "—" : 0)}
          previous={data?.previous.uniqueVisitors ?? 0}
          hint="Anonymous visitor IDs"
        />
        <KpiCard
          label="Sessions"
          value={data?.summary.sessions ?? (loading ? "—" : 0)}
          previous={data?.previous.sessions ?? 0}
          hint="Browser sessions"
        />
        <KpiCard
          label="Pages / session"
          value={data?.summary.avgPagesPerSession ?? (loading ? "—" : 0)}
          previous={data?.previous.avgPagesPerSession ?? 0}
          hint="Average depth per visit"
        />
      </div>

      <div className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800 sm:text-base">Views over time</h3>
          {loading && <span className="text-xs text-slate-400">Loading…</span>}
        </div>
        <div className="h-64 w-full sm:h-72">
          {!hasTraffic && !loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No traffic recorded yet. Browse the public site to start collecting data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={[0, Math.ceil(maxViews * 1.1) || 1]}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload;
                    return row?.date ? formatDateLabel(row.date) : "";
                  }}
                  formatter={(value, name) => [
                    Number(value ?? 0).toLocaleString(),
                    name === "views" ? "Page views" : "Visitors",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  fill="url(#trafficViews)"
                  name="views"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="#0ea5e9"
                  strokeWidth={1.75}
                  fill="transparent"
                  name="visitors"
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-700" /> Page views
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Unique visitors
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-800">Top pages</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium text-right">Views</th>
                  <th className="p-3 font-medium text-right">Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.topPages || []).map((row) => (
                  <tr key={row.path} className="hover:bg-slate-50/80">
                    <td className="max-w-[240px] truncate p-3 font-mono text-xs text-slate-800 sm:max-w-none sm:text-sm">
                      {row.path}
                    </td>
                    <td className="p-3 text-right tabular-nums">{row.views.toLocaleString()}</td>
                    <td className="p-3 text-right tabular-nums text-slate-500">
                      {row.visitors.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!loading && (data?.topPages.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-400">
                      No pages yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Devices</h3>
            <DeviceBar devices={data?.devices || []} />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Top referrers</h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {(data?.topReferrers || []).map((row) => (
                <li key={row.referrer} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="truncate text-slate-700">
                    {row.referrer === "direct"
                      ? "Direct / none"
                      : row.referrer === "internal"
                        ? "Internal"
                        : row.referrer}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">{row.views.toLocaleString()}</span>
                </li>
              ))}
              {!loading && (data?.topReferrers.length ?? 0) === 0 && (
                <li className="px-4 py-6 text-center text-sm text-slate-400">No referrers yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTrafficPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-slate-400">Loading traffic…</div>
      }
    >
      <TrafficDashboard />
    </Suspense>
  );
}
