import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from "../services/api";
import { FaTrashAlt, FaTrash } from "react-icons/fa";
import { MdArrowBack } from "react-icons/md";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: 0,
    stock: 0,
    description: "",
    variants: [],
  });

  // --- robust helper: recursively walk object and collect variant keys like "variants/0/size" ---
  function collectVariantEntries(obj) {
    const entries = []; // { path, value }
    function walk(current, parts) {
      if (current === null || current === undefined) return;
      if (typeof current !== "object") {
        // leaf primitive -> record
        entries.push({ path: parts.join("/"), value: current });
        return;
      }
      if (Array.isArray(current)) {
        current.forEach((item, idx) => walk(item, parts.concat(String(idx))));
        return;
      }
      // object
      Object.keys(current).forEach((k) => {
        // Use the key as-is; if key contains slashes already, keep them (they're significant in your DB)
        // normalize dots to slashes so both forms match (e.g. variants.0.size)
        const normalizedKey = k.includes(".") ? k.split(".").join("/") : k;
        walk(current[k], parts.concat(normalizedKey));
      });
    }
    walk(obj, []);
    return entries;
  }

  // Rebuild form from product (handles flattened keys anywhere in object)
  function setFormFromProduct(p) {
    if (!p) {
      setForm(prev => ({ ...prev, variants: [] }));
      return;
    }

    // First try straightforward array
    let variants = [];
    if (Array.isArray(p.variants) && p.variants.length) {
      variants = p.variants.map(v => ({
        _id: v._id ?? v.id,
        name: v.size ?? v.name ?? "",
        price: Number(v.sell_price ?? v.price ?? v.mrp ?? 0) || 0,
        stock: Number(v.stock ?? 0) || 0,
        mrp: Number(v.mrp ?? 0) || 0,
        sell_price: Number(v.sell_price ?? v.price ?? 0) || 0,
      }));
    } else {
      // Recursively collect all primitive leaves with their paths
      const entries = collectVariantEntries(p);
      // Look for paths that contain "variants/<idx>/<field>" anywhere
      const variantMap = {}; // { idx: { field: value } }
      const re = /(^|\/)variants\/(\d+)\/([^\/]+)$/; // matches .../variants/0/size
      entries.forEach(({ path, value }) => {
        // try direct match
        let m = path.match(re);
        if (!m) {
          // also try replacing dots with slashes (already normalized in collectVariantEntries),
          // and try decoding keys like 'variants/0/size' that might have extra prefixes
          m = path.match(re);
        }
        if (m) {
          const idx = parseInt(m[2], 10);
          const field = m[3];
          if (!variantMap[idx]) variantMap[idx] = {};
          variantMap[idx][field] = value;
        }
      });

      // If nothing found in that pass, try heuristic: find any array-like object whose elements look like variants
      if (Object.keys(variantMap).length === 0) {
        // heuristic scan: any array or object key whose first element has keys like size/name/price/sell_price/mrp
        // We'll scan top-level keys of p for arrays or nested arrays
        const topKeys = Object.keys(p);
        for (const k of topKeys) {
          const val = p[k];
          if (Array.isArray(val) && val.length && typeof val[0] === "object") {
            const sampleKeys = Object.keys(val[0]);
            const looksLikeVariant = sampleKeys.some(sk =>
              ["price", "sell_price", "mrp", "name", "size", "stock", "quantity", "qty"].includes(sk)
            );
            if (looksLikeVariant) {
              variants = val.map(v => ({
                _id: v._id ?? v.id,
                name: v.size ?? v.name ?? "",
                price: Number(v.sell_price ?? v.price ?? v.mrp ?? 0) || 0,
                stock: Number(v.stock ?? 0) || 0,
                mrp: Number(v.mrp ?? 0) || 0,
                sell_price: Number(v.sell_price ?? v.price ?? 0) || 0,
              }));
              break;
            }
          }
        }
      } else {
        // build variants array ordered by index
        const idxs = Object.keys(variantMap).map(Number).sort((a, b) => a - b);
        variants = idxs.map(i => {
          const v = variantMap[i] || {};
          return {
            name: (v.size ?? v.name ?? "").toString(),
            price: Number(v.sell_price ?? v.price ?? v.mrp ?? 0) || 0,
            stock: Number(v.stock ?? 0) || 0,
            mrp: Number(v.mrp ?? 0) || 0,
            sell_price: Number(v.sell_price ?? v.price ?? 0) || 0,
          };
        });
      }
    }

    // Images: same fallback logic (handles images/0 style keys)
    let images = Array.isArray(p.images) ? p.images.slice() : [];
    if ((!images || images.length === 0) && typeof p === "object") {
      Object.keys(p).forEach((k) => {
        const m = k.match(/^images\/(\d+)$/);
        if (m) images[parseInt(m[1], 10)] = p[k];
      });
      images = images.filter(Boolean);
    }

    console.log("DEBUG - product object for setFormFromProduct:", p);
    console.log("DEBUG - rebuilt variants for form:", variants);

    setForm({
      name: p.product_name ?? p.name ?? "",
      price: Number(p.price ?? p.sell_price ?? 0) || 0,
      stock: Number(p.stock ?? 0) || 0,
      description: p.description ?? "",
      variants,
      images,
    });
  }

  // fetch product
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setProduct(null);
      try {
        const res = await adminApi.get(`/products/${id}`);
        const body = res.data;
        console.log("DEBUG - Product API response:", body);
        const p = body?.product ?? body?.data ?? body;
        if (!p) throw new Error("Product not found");
        if (!cancelled) {
          setProduct(p);
          setFormFromProduct(p);
        }
      } catch (err) {
        console.error("Product load error:", err);
        if (!cancelled) setError("Product not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // variant helpers
  function addVariant() {
    setForm(f => ({ ...f, variants: [...(f.variants || []), { name: "", price: 0, stock: 0 }] }));
  }
  function updateVariant(idx, key, value) {
    setForm(f => {
      const v = [...(f.variants || [])];
      v[idx] = { ...v[idx], [key]: value };
      return { ...f, variants: v };
    });
  }
  function removeVariant(idx) {
    setForm(f => {
      const v = [...(f.variants || [])];
      v.splice(idx, 1);
      return { ...f, variants: v };
    });
  }

  // save changes (flattens variants back to variants/0/size etc.)
  async function handleSave(e) {
    e?.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        product_name: form.name,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        description: form.description,
      };

      if (form.variants && form.variants.length > 0) {
        form.variants.forEach((v, i) => {
          payload[`variants/${i}/size`] = v.name;
          payload[`variants/${i}/mrp`] = Number(v.mrp ?? v.price ?? 0);
          payload[`variants/${i}/sell_price`] = Number(v.price ?? v.sell_price ?? 0);
          payload[`variants/${i}/stock`] = Number(v.stock ?? 0);
        });
      }

      const res = await adminApi.put(`/products/${id}`, payload);
      const saved = res.data.data ?? res.data.product ?? res.data;
      setProduct(saved);
      setFormFromProduct(saved);
      alert("Saved successfully");
    } catch (err) {
      console.error("Save failed:", err);
      setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // delete product
  async function handleDelete() {
    if (!window.confirm("Delete product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/products/${id}`);
      alert("Deleted");
      navigate("/admin/products");
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err?.response?.data?.error || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="p-6">Loading product…</div>;
  if (error) return (
    <div className="p-6">
      <div className="text-red-600 mb-3">Error: {error}</div>
      <button className="px-3 py-2 border rounded" onClick={() => navigate(-1)}>Back</button>
    </div>
  );
  if (!product) return (
    <div className="p-6">
      <div>No product found</div>
      <button className="px-3 py-2 border rounded" onClick={() => navigate(-1)}>Back</button>
    </div>
  );

  return (
    <div className="productDetailPage p-[4%] bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Product detail</h1>
          <div className="flex gap-[1%]">
            <button onClick={() => navigate("/admin/products")} className="px-3 py-2 border-0 bg-[#0E4E9C] text-[#fff] cursor-pointer rounded"><MdArrowBack />Back</button>
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-2 bg-[#B52222] text-[#fff] cursor-pointer  rounded border-0"> <FaTrash />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white p-6 rounded shadow-sm space-y-4">
          <div className="">
            <label className="block text-sm text-slate-600 mb-1">Name</label>
            <input className="productNamelabel w-[30%] border rounded px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}} />
          </div>

          <div className="detailLabel grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Price</label>
              <input type="number" className="productpriceBox w-[30%] border rounded px-3 py-2" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}}/>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Stock</label>
              <input type="number" className="w-[30%] border rounded px-3 py-2" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}}/>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Created</label>
              <div className="w-[30%] border rounded px-3 py-2 bg-gray-50"style={{borderRadius:"8px", minHeight:"40px"}}>{new Date(product.createdAt).toLocaleString()}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Description</label>
            <textarea className="w-full border rounded px-3 py-2" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Variants</label>
              <button type="button" onClick={addVariant} className="text-sm text-indigo-600">Add variant</button>
            </div>

            {(form.variants || []).length === 0 && <div className="text-xs text-slate-400">No variants</div>}

            <div className="space-y-[2%]">
              {(form.variants || []).map((v, i) => (
                <div key={v._id || i} className="variantContainer grid grid-cols-12 gap-[2%] items-center">
                  <input className="col-span-5 border rounded px-2 py-1" placeholder="Name" value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)} style={{borderRadius:"8px", minHeight:"40px"}} />
                  <input className="col-span-3 border rounded px-2 py-1" placeholder="Price" type="number" value={v.price} onChange={(e) => updateVariant(i, "price", e.target.value)} style={{borderRadius:"8px", minHeight:"40px"}}/>
                  <input className="col-span-3 border rounded px-2 py-1" placeholder="Stock" type="number" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)} style={{borderRadius:"8px", minHeight:"40px"}}/>
                 <div className="removeButton"> <button type="button" className=" col-span-1 text-[#E31010]" onClick={() => removeVariant(i)}><FaTrashAlt /></button></div> 
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-[2%] mt-[2%] ">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded">
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button type="button" onClick={() => { setForm({
              name: product.name || "",
              price: product.price ?? 0,  
              stock: product.stock ?? 0,
              description: product.description || "",
              variants: (product.variants || []).map(v=>({ _id: v._id, name: v.name, price: v.price, stock: v.stock })),
            }); }} className="px-4 py-2 border rounded">Reset</button>
          </div>
        </form>

        <div className="mt-[2%] text-sm text-slate-500">
          <div><strong>Product ID:</strong> {product._id}</div>
          <div><strong>Last updated:</strong> {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}</div>
        </div>
      </div>
    </div>
  );
}
