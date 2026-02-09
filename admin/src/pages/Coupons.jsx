// admin/src/pages/Coupons.jsx
import React, { useState, useEffect } from "react";
import { adminApi ,adminAdminApi  } from "../services/api";
import toast from "react-hot-toast";

export default function Coupons() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ code:"", type:"percentage", value:10, maxDiscount:0, minOrderValue:0, usageLimit:0, singleUsePerUser:false, expiresAt:"", active:true });

  useEffect(()=>{ load(); }, []);
  async function load() {
    try {
      const res = await adminAdminApi.get("/coupons");
      setList(res.data.coupons || []);
    } catch(err){ console.error(err); toast.error("Failed to load coupons"); }
  }

  async function create() {
    try {
      const payload = { ...form };
      if (!payload.code) return toast.error("Code required");
      await adminAdminApi.post("/coupons", payload);
      toast.success("Coupon created");
      setForm({ code:"", type:"percentage", value:10, maxDiscount:0, minOrderValue:0, usageLimit:0, singleUsePerUser:false, expiresAt:"", active:true });
      load();
    } catch(err){ console.error(err); toast.error("Create failed"); }
  }

  async function remove(id) {
    if (!confirm("Delete coupon?")) return;
    try { await adminAdminApi.delete(`/coupons/${id}`); toast.success("Deleted"); load(); }
    catch(e){ console.error(e); toast.error("Delete failed"); }
  }

  return (
    <div className="CouponsPage p-6">
      <h1 className="text-2xl font-semibold">Coupons</h1>
      <div className="couponPagewrap grid gap-3 grid-cols-2  space-y-[3%] mt-4">
        <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="CODE" style={{borderRadius:"8px", minHeight:"40px"}}/>
        <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="percentage" >Percentage</option><option value="fixed">Fixed</option></select>value
        <input type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:Number(e.target.value)}))} placeholder="value"style={{borderRadius:"8px", minHeight:"30px"}} />max discount (optional)
        <input type="number" value={form.maxDiscount} onChange={e=>setForm(f=>({...f,maxDiscount:Number(e.target.value)}))} placeholder="max discount (optional)" style={{borderRadius:"8px", minHeight:"30px"}} />min order value
        <input type="number" value={form.minOrderValue} onChange={e=>setForm(f=>({...f,minOrderValue:Number(e.target.value)}))} placeholder="min order value"style={{borderRadius:"8px", minHeight:"30px"}}  />usage limit (0 unlimited)
        <input type="number" value={form.usageLimit} onChange={e=>setForm(f=>({...f,usageLimit:Number(e.target.value)}))} placeholder="usage limit (0 unlimited)"style={{borderRadius:"8px", minHeight:"30px"}}  />
        <label><input type="checkbox" checked={form.singleUsePerUser} onChange={e=>setForm(f=>({...f,singleUsePerUser:e.target.checked}))} /> Single use per user</label>
        <input type="datetime-local" value={form.expiresAt} onChange={e=>setForm(f=>({...f,expiresAt:e.target.value}))} />
      </div>
      <div className="mt-3"><button onClick={create} className="px-3 py-2 bg-[green] text-[white] border-0 cursor-pointer rounded mt-[2%] ">Create</button></div>

      <h2 className="mt-6 mb-2">Existing</h2>
      <div className="space-y-2">
        {list.map(c => (
          <div key={c._id} className="p-3 border rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">{c.code} — {c.type === "percentage" ? `${c.value}%` : `₹${c.value}`}</div>
              <div className="text-sm text-gray-600">Active: {String(c.active)} • Used: {c.usedCount}/{c.usageLimit || "∞"} • Min ₹{c.minOrderValue}</div>
            </div>
            <div>
              <button onClick={()=>remove(c._id)} className="px-2 py-1 border rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
