// src/pages/AnalyticsDetail.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#0f172a", "#2563eb", "#16a34a", "#ef4444", "#f59e0b", "#7c3aed"];

function toDevicePie(devices = {}) {
  return [
    { name: "Desktop", value: devices.desktop || devices.desktopSessions || 0 },
    { name: "Mobile", value: devices.mobile || devices.mobileSessions || 0 },
    { name: "Tablet", value: devices.tablet || devices.tabletSessions || 0 },
    { name: "Other", value: devices.other || 0 },
  ];
}
function toSourceBar(sources = {}) {
  return Object.keys(sources).map((k) => ({ name: k.replace(/_/g, " "), value: sources[k] }));
}

export default function AnalyticsDetail({
  apiBase = "/api",
  refreshIntervalMs = 0,
  withCredentials = false,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function fetchAnalytics() {
    setLoading(true);
    setError("");
    try {
      const opts = withCredentials ? { credentials: "include" } : {};
      const res = await fetch(`${apiBase}/analytics/summary`, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      console.debug("analytics/summary raw payload:", body);

      // normalize: server uses { success: true, summary: { ... } }
      const summary = (body && body.success && (body.summary || body.data)) ? (body.summary || body.data) : (body?.summary ?? body);
      if (!summary) {
        throw new Error("No summary object found in response");
      }
      setData(normalizePayload(summary));
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError(String(err.message || err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
    if (refreshIntervalMs && refreshIntervalMs > 0) {
      const id = setInterval(fetchAnalytics, refreshIntervalMs);
      return () => clearInterval(id);
    }
  }, []);

  const devicePie = useMemo(() => toDevicePie(data?.devices), [data]);
  const sourceBar = useMemo(() => toSourceBar(data?.sources), [data]);

  if (loading) return <div className="p-6 text-slate-600">Loading analytics…</div>;

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-3">Failed to load analytics: {error}</div>
        <div className="text-sm text-slate-500 mb-2">Open console to inspect the raw backend payload.</div>
        <button className="px-3 py-2 border rounded" onClick={fetchAnalytics}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-sm text-slate-400">No analytics summary returned from server.</div>
        <button className="mt-3 px-3 py-2 border rounded" onClick={fetchAnalytics}>Retry</button>
      </div>
    );
  }

  const conversionRate = data?.conversionRate ?? data?.conversion?.rate ?? null;
  const rawAvg = data?.avgSessionDuration ?? data?.avgSession ?? null;
  const avgSessionDuration = typeof rawAvg === "number" ? formatSeconds(rawAvg) : rawAvg;

  return (
    <div className="analyticDetailPage p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Analytics summary</h1>
          <div className="flex gap-2">
            <button className="px-3 py-2 border rounded" onClick={fetchAnalytics}>Refresh</button>
            <ExportCSV data={data} filename={`analytics-${new Date().toISOString().slice(0,10)}.csv`} />
          </div>
        </div>

        {/* KPI widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-sm text-slate-500">Total sessions</div>
            <div className="text-2xl font-semibold">{data?.sessionsTotal ?? 0}</div>
            <div className="text-xs text-slate-400">Users: {data?.users ?? 0}</div>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-sm text-slate-500">Conversion rate</div>
            <div className="text-2xl font-semibold">{conversionRate != null ? `${Number(conversionRate).toFixed(2)}%` : "—"}</div>
            <div className="text-xs text-slate-400">Orders / Sessions</div>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-sm text-slate-500">Avg session duration</div>
            <div className="text-2xl font-semibold">{avgSessionDuration ?? "—"}</div>
            <div className="text-xs text-slate-400">MM:SS</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-medium mb-2">Devices (sessions)</h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={devicePie} dataKey="value" nameKey="name" outerRadius={80} label>
                    {devicePie.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-sm text-slate-600">Total sessions: <strong>{data?.sessionsTotal ?? 0}</strong></div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 rounded shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Traffic sources</h3>
              <div className="text-sm text-slate-500">Where sessions originated</div>
            </div>

            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={toSourceBar(data?.sources || {})} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">
                    {(toSourceBar(data?.sources || {})).map((d,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <div className="font-medium">Top cities</div>
                <ol className="list-decimal ml-5 mt-2">
                  {(data?.cities || []).slice(0,5).map((c,i) => <li key={i}>{c.city} — {c.sessions}</li>)}
                </ol>
              </div>
              <div>
                <div className="font-medium">Top referrers</div>
                <ol className="list-decimal ml-5 mt-2">
                  {(data?.referrers || []).slice(0,5).map((r,i) => <li key={i}>{r.referrer} — {r.sessions}</li>)}
                </ol>
              </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-3 bg-white p-4 rounded shadow-sm mt-2">
            <h3 className="font-medium mb-2">Time series (sessions by day)</h3>
            <SmallTimeseries data={data?.timeseries || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* helpers */
function SmallTimeseries({ data = [] }) {
  if (!data.length) return <div className="text-sm text-slate-400">No timeseries data</div>;
  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="sessions">{data.map((d,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExportCSV({ data, filename = "analytics.csv" }) {
  function handleExport() {
    if (!data) return alert("No data to export");
    const rows = [["metric","value"]];
    rows.push(["total_sessions", data.sessionsTotal || 0]);
    rows.push(["users", data.users || 0]);
    const devices = toDevicePie(data.devices || {});
    devices.forEach(d => rows.push([`device_${d.name}`, d.value]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  return <button onClick={handleExport} className="px-3 py-2 border rounded">Export CSV</button>;
}

function normalizePayload(body) {
  if (!body) return null;
  // body is the summary object returned by backend
  return {
    sessionsTotal: body.sessionsTotal ?? body.sessions ?? 0,
    users: body.users ?? body.uniqueUsers ?? 0,
    devices: body.devices ?? body.deviceCounts ?? { desktop: body.desktop || 0, mobile: body.mobile || 0, tablet: body.tablet || 0 },
    sources: body.sources ?? body.trafficSources ?? {},
    cities: body.cities ?? body.topCities ?? [],
    referrers: body.referrers ?? body.topReferrers ?? [],
    timeseries: body.timeseries ?? body.daily ?? [],
    conversionRate: body.conversionRate ?? body.conversion?.rate ?? null,
    avgSessionDuration: body.avgSessionDuration ?? body.avgSession ?? null,
  };
}

function formatSeconds(sec) {
  if (sec == null) return null;
  const s = Math.round(Number(sec) || 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2,"0")}`;
}
