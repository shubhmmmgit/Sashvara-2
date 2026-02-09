// src/pages/Invoice.jsx
import React, { useEffect, useState } from "react";
import { adminApi, API_ORIGIN } from "../services/api";
import { formatCurrency } from "../utils/app";
import { FiDownload, FiFileText, FiCalendar, FiSearch } from "react-icons/fi";
import { IoIosRefresh } from "react-icons/io";

export default function Invoice() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [bulkDownloading, setBulkDownloading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await adminApi.get("/orders?limit=200");
      setOrders(res.data.orders || res.data || []);
    } catch (err) {
      console.error("Failed loading orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = orders
    // ✅ Only show orders that are paid or confirmed
    .filter((o) => {
      const status = (o.status || "").toLowerCase();
      return status === "paid" || status === "confirmed";
    })
    .filter((o) => (statusFilter === "all" ? true : (o.status || "") === statusFilter))
    .filter((o) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (o.email || "").toLowerCase().includes(s) ||
        (o._id || "").toLowerCase().includes(s) ||
        ((o.firstName || "") + " " + (o.lastName || "")).toLowerCase().includes(s)
      );
    });


  function openInvoice(orderId) {
     window.open(`${API_ORIGIN}/api/invoices/${orderId}/pdf`, "_blank");
  }

  async function downloadInvoice(orderId) {
    try {
      // Ask backend directly for the PDF
      const pdfResp = await adminApi.get(`/invoices/${orderId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([pdfResp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      const msg = err?.response?.data?.error || err.message || "Unknown error";
      alert("Invoice download failed: " + msg);
    }
  }

  async function bulkDownload() {
    if (!rangeFrom || !rangeTo) {
      alert("Select from and to dates for bulk download.");
      return;
    }
    setBulkDownloading(true);
    try {
      const res = await adminApi.post(
        "/invoices/bulk",
        { from: rangeFrom, to: rangeTo },
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoices_${rangeFrom}_${rangeTo}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Bulk download failed:", err);
      alert("Bulk download failed. Check console.");
    } finally {
      setBulkDownloading(false);
    }
  }

  // helper quick ranges
  function setLastWeek() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    setRangeFrom(start.toISOString().slice(0, 10));
    setRangeTo(end.toISOString().slice(0, 10));
  }
  function setThisMonth() {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setRangeFrom(start.toISOString().slice(0, 10));
    setRangeTo(end.toISOString().slice(0, 10));
  }

  return (
    <div className="InvoicePage ml-64 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <button
            onClick={() => {
              setRangeFrom("");
              setRangeTo("");
              setStatusFilter("all");
              setSearch("");
              loadOrders();
            }}
            className="px-3 py-2 border rounded bg-[#28A616] text-[#fff] "
          > <IoIosRefresh />

            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className=" p-4 rounded shadow-sm mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-[1%] mb-[2%] ">
              <FiSearch />
              <input
                placeholder="Search order id / email / name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded px-3 py-2 w-[320px]"style={{borderRadius:"4px", minHeight:"40px"}} 
              />
              <select
                className="border rounded px-2 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)} style={{borderRadius:"4px", minHeight:"40px"}}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <div className="invoiceBulkDownload flex items-center gap-[2%] mb-[2%] space-y-[2%] ">
              <div className="flex items-center gap-1">
                <FiCalendar />
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="border rounded px-2 py-2"
                />
              </div>
              <div className="flex items-center gap-1">
                <FiCalendar />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="border rounded px-2 py-2"
                />
              </div>
              <button onClick={setLastWeek} className="px-3 py-2 border rounded"style={{borderRadius:"4px"}}>
                Last 7d
              </button>
              <button onClick={setThisMonth} className="px-3 py-2 border rounded">
                This month
              </button>
              <button
                onClick={bulkDownload}
                disabled={bulkDownloading}
                className="bg-indigo-600 text-white px-3 py-2 rounded"
              >
                {bulkDownloading ? "Preparing..." : <><FiDownload className="inline mr-1" /> Bulk download</>}
              </button>
            </div>
          </div>
        </div>

        {/* Order list */}
        <div className="bg p-4 rounded shadow-sm">
          {loading && <div className="text-sm text-slate-500">Loading orders...</div>}
          {filtered.length === 0 && !loading && <div className="text-sm text-slate-400 py-6">No orders.</div>}

          <div className="space-y-[3%]">
            {filtered.map((o) => (
              <div key={o._id} className="invoiceContainer py-3 flex items-center justify-between border bg-[#fff] mt-[5%] " style={{borderRadius:"8px", minHeight:"80px",boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"}}>
                <div>
                  <div className="font-semibold ml-[2%] ">
                    {(o.firstName || "") + " " + (o.lastName || "") || o.email}
                  </div>
                  <div className="text-sm text-slate-500 ml-[2%]">
                    {o.email} • {o.phone} • {new Date(o.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className=" invoiceButton flex items-center gap-[2%] mr-[1%] ml-[2%] ">
                  <div className="text-lg font-semibold">{formatCurrency(o.total || 0)}</div>
                  <button
                    onClick={() => openInvoice(o._id)}
                    className="px-3 py-2 border rounded flex items-center gap-2"
                  >
                    <FiFileText /> View
                  </button>
                  <button
                    onClick={() => downloadInvoice(o._id)}
                    className="px-3 py-2 border rounded flex items-center gap-2  "
                  >
                    <FiDownload /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
