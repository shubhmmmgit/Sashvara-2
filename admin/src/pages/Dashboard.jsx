// Sashvara/admin/src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { adminApi, API_ORIGIN } from "../services/api";
import { formatCurrency, shortDate } from "../utils/app"; 
import { io } from "socket.io-client";
import { FiUsers, FiShoppingCart, FiDollarSign, FiTrendingUp } from "react-icons/fi";
import adminSocket from "../services/adminSocket";

const BarChart = ({ data = [], height = 120, width = 480 }) => {
  if (!data.length) return <div className="text-sm text-slate-400">No chart data</div>;

  const max = Math.max(...data.map((d) => d.value), 1);
  const padding = 10;
  const barGap = 8;
  const barWidth = (width - padding * 2 - barGap * (data.length - 1)) / data.length;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="rounded">
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {data.map((d, i) => {
        const barHeight = (d.value / max) * (height - 30);
        const x = padding + i * (barWidth + barGap);
        const y = height - barHeight - 20;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill="#0f172a"
              opacity="0.9"
            />
            <text
              x={x + barWidth / 2}
              y={height - 6}
              fontSize="10"
              textAnchor="middle"
              fill="#334155"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState({ totalSales: 0, totalOrders: 0 });
  const [visitors, setVisitors] = useState([]);
  const socketRef = useRef(null);

  // Consider these statuses as "placed & paid" (adjust if your backend uses different names)
  const completedStatuses = ["paid", "confirmed", "shipped", "delivered"];

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await adminApi.get("/orders?limit=1000"); 
        if (!mounted) return;
        const fetched = (res.data && res.data.orders) ? res.data.orders : (Array.isArray(res.data) ? res.data : []);
        setOrders(fetched);

        // Only include orders that are placed & paid/confirmed/shipped/delivered
        const valid = fetched.filter((o) => completedStatuses.includes((o.status || "").toLowerCase()));
        const totalSales = valid.reduce((s, o) => s + Number(o.total || 0), 0);
        const totalOrders = valid.length;
        setMetrics({ totalSales, totalOrders });
      } catch (err) {
        console.error("Failed to load orders:", err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // socket.io for live visitors
  useEffect(() => {
    const socket = adminSocket;
    socket.on("connect", () => console.debug("socket connected:", socket.id));

    socket.on("liveVisitor", (payload) => {
      setVisitors((v) => {
        const next = [{ ...payload, ts: payload.ts || Date.now() }, ...v];
        return next.slice(0, 12);
      });
    });

    socket.on("orderCreated", (order) => {
      // Always add to orders array (so admin can inspect)
      setOrders((o) => [order, ...o].slice(0, 1000));

      // But only update metrics if order is considered 'placed & paid'
      const status = (order.status || "").toLowerCase();
      if (completedStatuses.includes(status)) {
        setMetrics((m) => ({
          totalSales: m.totalSales + Number(order.total || 0),
          totalOrders: m.totalOrders + 1,
        }));
      }
    });

    return () => {
      socket.off("liveVisitor");
      socket.off("orderCreated");
      socket.off("connect");
    };
  }, []); // completedStatuses is constant here


  const conversionRate = useMemo(() => {
    const visitorsCount = Math.max(visitors.length, 1);
    const rate = (metrics.totalOrders / visitorsCount) * 100;
    return Number.isFinite(rate) ? rate.toFixed(2) : "0.00";
  }, [metrics.totalOrders, visitors]);

  const salesByMonth = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      months.push({ key, label: d.toLocaleString("default", { month: "short" }) });
    }
    const map = months.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {});
    // Use only completed orders for chart as well
    for (const o of orders) {
      const status = (o.status || "").toLowerCase();
      if (!completedStatuses.includes(status)) continue;
      const created = new Date(o.createdAt || o.created || o.updatedAt || Date.now());
      const key = `${created.getFullYear()}-${created.getMonth() + 1}`;
      if (map[key] !== undefined) {
        map[key] += Number(o.total || 0);
      }
    }
    return months.map((m) => ({ label: m.label, value: Math.round(map[m.key] || 0) }));
  }, [orders]);

  return (
    <div className=" min-h-screen p-[5%] bg-[#F5F5F5] ">
     
      <div className="dashboardPage max-w-[1400px] mx-auto  space-y-[5%]">
         <div className="dashboardAnalytics" style={{borderRadius:"8px", }}>
        <h1 className="text-2xl font-semibold text-[#001f3f] mb-4">Dashboard</h1>

        {/* Metric cards */}
        <div className="metricCard grid grid-cols-5 gap-[5%] mb-6">
          <div className="livevisitorBox border bg-[#fff]  flex items-center gap-4"style={{borderRadius:"8px",boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", minHeight:"60px"}}>
            <div className="p-3 bg-indigo-50 rounded">
              <FiUsers className="text-2xl text-indigo-700 ml-[5%] " />
            </div>
            <div className="">
              <div className="text-sm ">Live visitors
              <div className="text-lg text-[#369C13] ml-[10%] font-semibold">{visitors.length}</div></div>  
              
            </div>
          </div>

          <div className="border bg-[#fff] p-4 rounded shadow-sm flex items-center gap-4"style={{borderRadius:"8px",boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",minHeight:"60px"}}>
            <div className="p-3 bg-green-50 rounded">
              <FiShoppingCart className="text-2xl text-green-700" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total orders</div>
              <div className="text-lg ml-[5%] font-semibold">{metrics.totalOrders}</div>
              
            </div>
          </div>

          <div className="border bg-[#fff] p-4 rounded shadow-sm flex items-center gap-4"style={{borderRadius:"8px",boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",minHeight:"60px" }}>
            <div className="p-3 bg-amber-50 rounded">
              <FiDollarSign className="text-2xl text-amber-700" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total sales</div>
              <div className="text-lg ml-[5%] font-semibold">{formatCurrency(metrics.totalSales)}</div>
             
            </div>
          </div>
          

          <div className="border bg-[#fff] p-4 rounded shadow-sm flex items-center gap-4"style={{borderRadius:"8px",boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",minHeight:"60px"}}>
            <div className="p-3 bg-rose-50 rounded">
              <FiTrendingUp className="text-2xl text-rose-700" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Conversion rate</div>
              <div className="text-lg ml-[5%] font-semibold">{conversionRate}%</div>
            
            </div>
          </div>
        </div>
         </div>
        {/* Charts + visitors list */}
        <div className="SalesBox border bg-[#fff] grid grid-cols-1 lg:grid-cols-3 gap-4"style={{borderRadius:"8px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"}}>
          <div className="col-span-2  p-4 rounded shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium text-[#001f3f] ml-[5%] ">Sales (last 6 months)</h2>
              <div className="text-sm text-slate-500 mr-[2%]  ">Overview</div>
            </div>

            <div className="w-full  ">
              <BarChart data={salesByMonth} height={200} width={720}  />
            </div>

            <div className="mt-4 text-sm text-slate-500 ml-[2%] ">
              Tip: Click the Orders page to view order-level breakdowns and invoice downloads.
            </div>
          </div>
            </div>
          <div className="border recentVisitor bg-[#fff] p-4 rounded shadow-sm  w-[40%] ml-[30%] "style={{borderRadius:"8px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"}}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium ml-[5%] ">Recent visitors</h2>
              <div className="text-sm text-slate-400 mr-[2%] ">{visitors.length} tracked</div>
            </div>

            <ul className="recent-visitors  space-y-[5%] list-none w-[30%]">
              {visitors.length === 0 && <li className="text-sm text-slate-400">No visitors yet</li>}
              {visitors.map((v, i) => (
                <li key={i} className="p-2 rounded border border-slate-100"style={{borderRadius:"8px", minHeight:"40px"}}>
                  <div className="flex items-center justify-between" >
                    <div>
                      <div className="text-sm font-medium ml-[2%] ">{v.path || v.url || "Unknown"}</div>
                      <div className="text-xs text-slate-500">{v.city || v.device?.type || "–"}</div>
                    </div>
                    <div className="text-xs text-slate-400 mr-[2%] ">{shortDate(v.ts)}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-[2%] ml-[4%] mb-[2%] ">
              <button
              
                onClick={() => setVisitors([])}
                className="text-xs px-2 py-1 border rounded text-slate-600 hover:bg-slate-50"
              >
                Clear list
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
