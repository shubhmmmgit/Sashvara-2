// src/pages/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../services/api";
import { formatCurrency } from "../utils/app";
import {
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiPlusCircle,
  FiUser,
  FiPackage,
} from "react-icons/fi";
import { FcShipped } from "react-icons/fc";
import { CiMail } from "react-icons/ci";
import { BsFillCartCheckFill } from "react-icons/bs";
const BACKEND_ORIGIN = (import.meta.env?.VITE_API_ORIGIN || "https://sashvara-2.onrender.com").replace(/\/+$/, "");

export default function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [abandoned, setAbandoned] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("orders"); // 'orders' | 'abandoned' | 'create'
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // create order form (default shape)
  const emptyOrderForm = {
    email: "",
    phone: "",
    country: "India",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "cod",
    currency: "INR",
    cartItems: [],
    total: 0,
    discountCode: "",
    status: "pending",
    trackingHistory: [],
  };
  const [form, setForm] = useState(emptyOrderForm);
  const [jsonImport, setJsonImport] = useState("");

  // ===== Load Orders =====
  async function loadOrders() {
    setLoading(true);
    try {
      const res = await adminApi.get("/orders");
      setOrders(res.data.orders || res.data || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // ===== Load Abandoned Orders =====
  async function loadAbandoned({ olderThanMinutes = 60, unpaidMethods = ["partial", "upi"] } = {}) {
    setLoading(true);
    try {
      const q = `?olderThanMinutes=${olderThanMinutes}&unpaidMethods=${encodeURIComponent(
        unpaidMethods.join(",")
      )}`;
      const res = await adminApi.get(`/orders/abandoned${q}`);
      const data = res?.data;
      if (!data) {
        setAbandoned([]);
        return;
      }
      // support a couple of response shapes
      const items = data.orders || data.checkouts || data.items || data.data || [];
      setAbandoned(items);
    } catch (err) {
      console.error("Failed to load abandoned orders:", err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      alert("Failed to load abandoned orders. " + (serverMsg ? `Server: ${serverMsg}` : "See console."));
      setAbandoned([]);
    } finally {
      setLoading(false);
    }
  }

  // ===== Create from abandoned =====
  function createFromAbandoned(item) {
    const cart = item.cartItems || item.items || [];
    setForm((f) => ({
      ...f,
      email: item.email || "",
      phone: item.phone || "",
      cartItems: cart.map((ci) => ({
        name: ci.name,
        price: ci.price || ci.sell_price || ci.mrp || 0,
        qty: ci.qty || ci.quantity || 1,
        size: ci.size,
        image: ci.image || ci.images?.[0] || "",
      })),
    }));
    setTab("create");
  }

  // ===== Send reminder =====
  async function sendPaymentReminder(orderId) {
    if (!window.confirm("Send payment reminder for this abandoned order?")) return;
    try {
      await adminApi.post(`/orders/${orderId}/remind`);
      alert("Reminder queued/sent.");
    } catch (err) {
      console.error("Failed to send reminder:", err);
      alert("Failed to send reminder. See console.");
    }
  }

  // ===== Filter + Search =====
  const visibleOrders = orders
    .filter((o) => (filterStatus === "all" ? true : o.status === filterStatus))
    .filter((o) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (o.email || "").toLowerCase().includes(s) ||
        (o.phone || "").toLowerCase().includes(s) ||
        (o._id || "").toString().includes(s) ||
        ((o.firstName || "") + " " + (o.lastName || "")).toLowerCase().includes(s)
      );
    });

  // ===== Toggle collapse =====
  function toggle(id) {
    setActiveId((cur) => (cur === id ? null : id));
  }

  // ===== Change order status =====
  async function changeStatus(orderId, targetStatus) {
    if (!window.confirm(`Change status to "${targetStatus}"?`)) return;
    try {
      await adminApi.put(`/orders/${orderId}/status`, { status: targetStatus });
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: targetStatus } : o))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Check console.");
    }
  }

  // ===== Create Order =====
  async function handleCreate(e) {
    if (e && e.preventDefault) e.preventDefault();
    setCreating(true);

    try {
      const payload = { ...form };
      // ensure numbers
      payload.cartItems = (payload.cartItems || []).map((it) => ({
        name: it.name,
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 1,
        image: it.image || "",
      }));

      if (!payload.total || payload.total === 0) {
        payload.total = payload.cartItems.reduce(
          (sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1),
          0
        );
      }

      // Basic validation
      if (!payload.email && !payload.phone) {
        alert("Please provide at least an email or phone for this order.");
        setCreating(false);
        return;
      }
      if (!payload.cartItems.length) {
        alert("Add at least one cart item to create an order.");
        setCreating(false);
        return;
      }

      await adminApi.post("/orders", payload);
      await loadOrders();
      setForm(emptyOrderForm);
      setJsonImport("");
      setTab("orders");
      alert("Order created successfully.");
    } catch (err) {
      console.error("Create order failed:", err);
      alert("Create failed. Check console.");
    } finally {
      setCreating(false);
    }
  }

  // ===== Import JSON into Form =====
  function importJsonToForm() {
    if (!jsonImport) return alert("Paste order JSON into import box first.");
    try {
      const parsed = JSON.parse(jsonImport);
      const mapped = {
        email: parsed.email || parsed.userEmail || "",
        phone: parsed.phone || "",
        country: parsed.country || "India",
        firstName: parsed.firstName || parsed.first_name || parsed.name?.split?.(" ")?.[0] || "",
        lastName:
          parsed.lastName || parsed.last_name || parsed.name?.split?.(" ")?.slice(1).join(" ") || "",
        address: parsed.address || parsed.addressLine || "",
        apartment: parsed.apartment || "",
        city: parsed.city || "",
        state: parsed.state || "",
        pincode: parsed.pincode || parsed.zip || "",
        paymentMethod: parsed.paymentMethod || parsed.payment_method || "cod",
        currency: parsed.currency || "INR",
        cartItems: parsed.cartItems || parsed.items || [],
        total: parsed.total || parsed.amount || 0,
        discountCode: parsed.discountCode || "",
        status: parsed.status || "pending",
        trackingHistory: parsed.trackingHistory || parsed.tracking_history || [],
      };
      setForm(mapped);
      alert("Imported JSON into form. Review before creating.");
    } catch (err) {
      console.error("Invalid JSON:", err);
      alert("Invalid JSON. Check console.");
    }
  }

  // ===== Delete Order =====
  async function handleDelete(id) {
    if (!window.confirm("Delete this order? This cannot be undone.")) return;
    try {
      await adminApi.delete(`/orders/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      console.error("Delete order failed:", err);
      alert("Delete failed. Check console.");
    }
  }

  // ===== Lifecycle =====
  useEffect(() => {
    loadOrders();
    loadAbandoned();
  }, []);

  // ===== Derived total (live) =====
  const computedTotal = useMemo(() => {
    return (form.cartItems || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
  }, [form.cartItems]);

  useEffect(() => {
    // Keep form.total in sync with computedTotal
    setForm((f) => ({ ...f, total: computedTotal }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedTotal]);

  // ===== Cart item helpers for Create form =====
  function addCartItem() {
    setForm((f) => ({ ...f, cartItems: [...(f.cartItems || []), { name: "", price: 0, qty: 1, image: "" }] }));
  }
  function updateCartItem(idx, key, value) {
    setForm((f) => {
      const items = [...(f.cartItems || [])];
      items[idx] = { ...(items[idx] || {}), [key]: value };
      return { ...f, cartItems: items };
    });
  }
  function removeCartItem(idx) {
    setForm((f) => {
      const items = [...(f.cartItems || [])];
      items.splice(idx, 1);
      return { ...f, cartItems: items };
    });
  }

  // ===== JSX =====
  return (
    <div className="adminordersPage ml-64 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Orders</h1>
          <div className="flex gap-[4px] items-center">
            
            <button onClick={() => setTab("abandoned")} className={`px-3 py-1 rounded border-0 bg-[#E63C29] text-[#fff] cursor-pointer ${tab === "abandoned" ? "border" : "bg-white "}`}>Abandoned</button>
            <button onClick={() => setTab("create")} className={`px-3 py-1 rounded border-0 bg-[#28A616] text-[#fff] cursor-pointer ${tab === "create" ? "bg-indigo-600 text-white" : "bg-white"}`}><FiPlusCircle /> Create</button>
          </div>
        </div>

        {/* ===== Orders Tab ===== */}
        {tab === "orders" && (
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[3%] mb-[3%]">
              <div className="flex items-center gap-[2%]" >
                <FiSearch />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email / phone / order id / name" className="border rounded px-3 py-2 w-[300px]" style={{borderRadius:"8px", minHeight:"40px"}}  />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded px-2 py-2"style={{borderRadius:"8px", minHeight:"40px"}} >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                 
                </select>
                <button onClick={() => { setFilterStatus("all"); setSearch(""); }} className="px-3 py-2 border-0 rounded bg-[#E69A29] text-[#fff] "style={{borderRadius:"8px", minHeight:"40px"}} >Reset</button>
              </div>
              <div className="text-sm text-slate-500">Showing {visibleOrders.length} / {orders.length} orders</div>
            </div>

            {loading && <div className="text-sm text-slate-500">Loading...</div>}
            {visibleOrders.length === 0 && !loading && <div className="text-sm text-slate-400 py-6">No orders found.</div>}

            <div className="divide-y space-y-[3%] ">
              {visibleOrders.map((o) => (
                <div key={o._id} className="orderdetailContainer py-4 bg-[#fff] border"style={{borderRadius:"8px", minHeight:"80px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"}}>
                  {/* Order Header */}
                  <div className="orderHeaderWrap flex items-start  justify-between gap-[5%]">
                    <div className="flex-1 ml-[2%] mt-[1%] ">
                      <div className="flex items-center gap-[3%]">
                        
                        <div className="font-semibold text-[#001f3f] " style={{fontWeight:550}}>{(o.firstName || "") + " " + (o.lastName || "") || o.email}</div>
                        <div className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">{(o.paymentMethod || "").toUpperCase()}</div>
                        <div className={`text-xs px-2 py-1 rounded ${o.status === "pending" ? "bg-yellow-100 text-yellow-700" : o.status === "shipped" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {o.status}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">{o.email} • {o.phone} • {o.city}, {o.state}</div>
                    </div>

                    <div className="flex items-center gap-[2%] ml-[1%] ">
                      <div className="text-lg font-semibold">{formatCurrency(o.total || 0)}</div>
                      <div className="orderButtons flex items-center gap-[2%] mt-[5%] mr-[2%] ">
                        {o.status !== "shipped" && <button onClick={() => changeStatus(o._id, "shipped")} className="px-3 py-1 border-0 cursor-pointer text-sm  text-[#fff] bg-[#E69A29] " style={{borderRadius:"4px"}}> <BsFillCartCheckFill />  Mark shipped</button>}
                        {o.status !== "delivered" && <button onClick={() => changeStatus(o._id, "delivered")} className="px-3 py-1 border-0 cursor-pointer text-[#fff] bg-[#28A616] text-sm"style={{borderRadius:"4px"}}><FcShipped className="mr-[2%]" />Mark delivered</button>}
                       {/*  <Link to={`/admin/orders/${o._id}`} className="px-3 py-1 no-underline rounded text-sm">Details</Link>*/}
                        <button onClick={() => handleDelete(o._id)} className="px-2 py-1 text-[#fff] bg-[#E63C29] cursor-pointer border-0 "style={{borderRadius:"4px", minHeight:"30px"}}><FiTrash2 /></button>
                        <button onClick={() => toggle(o._id)} className="p-2 rounded border cursor-pointer ml-2"style={{borderRadius:"4px"}}>
                          {activeId === o._id ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {activeId === o._id && (
                    <div className="mt-[2%] border-t pt-3 grid grid-cols-1 md:grid-cols-3 ">
                      {/* Items */}
                      <div className="md:col-span-2 ml-[4%] ">
                        <h4 className="font-medium mb-2 flex items-center gap-[2]"><FiPackage /> Items</h4>
                        <div className="divide-y ">
                          {(o.cartItems || []).map((it, i) => (
                            <div key={i} className="flex items-center gap-[2%] py-2  ">
                              <div style={{ width: 72, height: 72, borderRadius: 4, overflow: "hidden", background: "#f5f5f5", marginBottom:10, marginTop:10 }}>
                                {it.image ? <img src={it.image} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover", }} /> : <div className="text-xs text-slate-400 p-2 ">No image</div>}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold">{it.name}</div>
                                <div className="text-sm text-slate-500">Qty: {it.qty} • {formatCurrency(it.price)}</div>
                                <div className="text-sm text-slate-500">Qty: {it.size}</div>
                              </div>
                              
                            </div>
                          ))}
                        </div>

                        {o.trackingHistory?.length > 0 && (
                          <div className="mt-3">
                            <h4 className="font-medium mb-2">Tracking</h4>
                            <ul className="text-sm text-slate-600">
                              {o.trackingHistory.map((t, i) => <li key={i}>{t}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Customer Details */}
             <div className="bg-slate-50 p-3 rounded text-[#] ml-[4%] mb-[2%]">
             <h4 className="font-medium mb-2 flex items-center gap-2">
          <FiUser /> Customer
        </h4>
         <div className="text-sm">
          <table className="w-full text-left border-collapse">
          <tbody>
         <tr>
          <td className="font-semibold" style={{ fontWeight: 550 }}>First Name:</td>
          <td>{o.firstName}</td>
          </tr>
          <tr>
          <td className="font-semibold" style={{ fontWeight: 550 }}>Last Name:</td>
          <td>{o.lastName}</td>
          </tr>
          <tr>
          <td lassName="font-semibold" style={{ fontWeight: 550 }}>Email:</td>
            <td>{o.email}</td>
           </tr>
          <tr>
          <td lassName="font-semibold" style={{ fontWeight: 550 }}>Phone:</td>
          <td>{o.phone}</td>
           </tr>
           <tr>
          <td className="align-top" style={{ fontWeight: 550 }}>Address:</td>
          <td>
            {o.address} <br />
            {o.apartment && <>{o.apartment}<br /></>}
            {o.city} • {o.state} • {o.pincode} <br />
            {o.country}
             </td>
             </tr>
          <tr>
           <td className="text-xs text-slate-500"style={{ fontWeight: 550 }}>Created:</td>
              <td className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</td>
           </tr>
            <tr>
          <td className="text-xs text-slate-500"style={{ fontWeight: 550 }}>Updated:</td>
          <td className="text-xs text-slate-500">{new Date(o.updatedAt).toLocaleString()}</td>
           </tr>
            </tbody>
         </table>
            </div>
                  </div>

                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Abandoned Tab ===== */}
        {tab === "abandoned" && (
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="text-lg font-medium mb-3">Abandoned Orders ({abandoned.length})</h3>
            {abandoned.length === 0 && <div className="text-sm text-slate-400">No abandoned orders found.</div>}
            <div className="divide-y space-y-[3%]  ">
              {abandoned.map((c) => (
                <div key={c._id || c.id || JSON.stringify(c)} className="py-3 flex justify-between items-start gap-[2%] bg-[#fff] border"style={{borderRadius:"4px",boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", minHeight:"70px"}}>
                  <div className="ml-[1%] mt-[1%] ">
                    <div className="font-semibold">{c.email || "Unknown"}</div>
                    <div className="text-sm text-slate-500">{(c.cartItems || []).length} items • {c.phone}</div>
                    <div className="text-xs text-slate-400 mt-1">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</div>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-[2%] mt-[1%] mr-[2%]">
                  
                    <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(c))} className="px-3 py-1 border-0 cursor-pointer bg-[#0E3E82] text-[#fff] rounded">Copy JSON</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Create Tab ===== */}
        {tab === "create" && (
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2"><FiPlusCircle /> Create Order (admin)</h3>

            <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: customer + shipping */}
              <div className="lg:col-span-2 space-y-[3%] ">
                <div className="grid grid-cols-2 gap-[0%]">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">First name</label>
                    <input className="w-[40%] border rounded px-3 py-2 " value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}}/>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Last name</label>
                    <input className="w-[40%] border rounded px-3 py-2" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-[2%]">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Email</label>
                    <input className="w-full border rounded px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}}  />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Phone</label>
                    <input className="w-full border rounded px-3 py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}}  />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Country</label>
                    <input className="w-full border rounded px-3 py-2" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Address</label>
                  <input className="w-full border rounded px-3 py-2 mb-[2%]" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}} />
                  <div className="grid grid-cols-3 gap-[2%] mb-[2%] ">
                    <input placeholder="Apartment" className="border rounded px-3 py-2" value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}} />
                    <input placeholder="City" className="border rounded px-3 py-2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}} />
                    <input placeholder="State" className="border rounded px-3 py-2" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}}  />
                  </div>
                  <div className="grid grid-cols-2 gap-[2%] mt-2">
                    <input placeholder="Pincode" className="border rounded px-3 py-2" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}}  />
                    <input placeholder="Currency" className="border rounded px-3 py-2" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={{borderRadius:"4px", minHeight:"40px"}} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Payment method</label>
                  <select className="w-48 border rounded px-3 py-2" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}style={{borderRadius:"4px", minHeight:"40px"}} >
                    <option value="cod">COD</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="upi">UPI</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>

                {/* Cart items editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Cart items</label>
                    <div className="flex gap-[1%]">
                      <button type="button" onClick={addCartItem} className="px-3 py-1 border-0 cursor-pointer bg-[#3B751E] text-[#fff] rounded text-sm">Add item</button>
                      <button type="button" onClick={() => setForm(emptyOrderForm)} className="px-3 py-1 border-0 cursor-pointer bg-[#334896] text-[#fff]  rounded text-sm">Reset form</button>
                    </div>
                  </div>

                  {(form.cartItems || []).length === 0 && <div className="text-xs text-slate-400 mb-2">No items — add items here to create the order.</div>}

                  <div className="space-y-2">
                    {(form.cartItems || []).map((it, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input className="col-span-5 border rounded px-2 py-1" placeholder="Name" value={it.name} onChange={(e) => updateCartItem(i, "name", e.target.value)} />
                        <input className="col-span-2 border rounded px-2 py-1" placeholder="Price" type="number" value={it.price} onChange={(e) => updateCartItem(i, "price", e.target.value)} />
                        <input className="col-span-2 border rounded px-2 py-1" placeholder="Qty" type="number" value={it.qty} onChange={(e) => updateCartItem(i, "qty", e.target.value)} />
                        <input className="col-span-2 border rounded px-2 py-1" placeholder="Image URL" value={it.image} onChange={(e) => updateCartItem(i, "image", e.target.value)} />
                        <button type="button" className="col-span-1 text-red-600" onClick={() => removeCartItem(i)}><FiTrash2 /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm text-slate-600 mb-1">Discount code (optional)</label>
                  <input className="w-48 border rounded px-3 py-2" value={form.discountCode} onChange={(e) => setForm({ ...form, discountCode: e.target.value })} style={{borderRadius:"4px", minHeight:"30px"}}  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm text-slate-600 mb-1">Tracking history (comma separated)</label>
                  <input className="w-full border rounded px-3 py-2" value={(form.trackingHistory || []).join(" | ")} onChange={(e) => setForm({ ...form, trackingHistory: e.target.value ? e.target.value.split("|").map(s => s.trim()) : [] })} style={{borderRadius:"4px", minHeight:"40px"}} />
                </div>
              </div>

              {/* Right column: order summary + actions */}
              <div className="bg-slate-50 p-4 rounded space-y-3">
                <div>
                  <div className="text-sm text-slate-500">Order total</div>
                  <div className="text-2xl font-semibold">{formatCurrency(form.total || 0)}</div>
                  <div className="text-xs text-slate-400">Calculated from cart items</div>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Status</label>
                  <select className="w-full border rounded px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}style={{borderRadius:"4px", minHeight:"40px"}} >
                    <option value="pending">pending</option>
                    <option value="unpaid">unpaid</option>
                    <option value="paid">paid</option>
                    <option value="confirmed">confirmed</option>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Import order JSON</label>
                  <textarea rows={4} className="w-full border rounded px-3 py-2" placeholder='Paste order JSON and click "Import JSON"' value={jsonImport} onChange={(e) => setJsonImport(e.target.value)} style={{borderRadius:"8px", minHeight:"40px"}} />
                  <div className="flex gap-[1%] mt-[0%] mb-[2%] ">
                    <button type="button" onClick={importJsonToForm} className="px-3 py-1 border-0 cursor-pointer bg-[#334896] text-[#fff]  rounded">Import JSON</button>
                    <button type="button" onClick={() => setJsonImport("")} className="px-3 py-1 border-0 cursor-pointer bg-[#334896] text-[#fff] border rounded">Clear</button>
                  </div>
                </div>

                <div className="flex flex-col space-y-[1%] ">
                  <button type="submit" disabled={creating} className=" w-[30%]  border-0 cursor-pointer bg-[#3B751E] text-[#fff] px-4 py-2 rounded">
                    {creating ? "Creating..." : "Create order"}
                  </button>
                  <button type="button" onClick={() => { setForm(emptyOrderForm); setJsonImport(""); }} className="w-[30%]  border-0 cursor-pointer bg-[#CF7A2D] text-[#fff] px-3 py-2 border rounded">
                    Reset
                  </button>
                  <button type="button" onClick={() => { setTab("orders"); }} className="w-[30%]  border-0 cursor-pointer bg-[#334896] text-[#fff] px-3 py-2 border rounded">
                    Back to orders
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
