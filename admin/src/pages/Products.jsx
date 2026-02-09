// src/pages/Products.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
// <-- use named import (adminApi is exported as a named export)
import { adminApi } from "../services/api";
import { formatCurrency } from "../utils/app";
import {
  FiEdit,
  FiTrash2,
  FiPlusCircle,
  FiTrendingUp,
  FiPlus,
  FiMinus,
} from "react-icons/fi";
 //const BACKEND_HOST = import.meta.env.VITE_API_HOST || "http://localhost:5000/api/admin"; 
 export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // form default matching your schema
  const emptyForm = {
    product_id: "",
    product_name: "",
    category: "",
    colour: "",
    gender: "Women",
    description: "",
    images: [], // array of urls or File objects (depending on upload flow)
    newArrival: false,
    bestSeller: false,
    variants: [], // { size, mrp, sell_price }
    stock: 0,
  };
  const [form, setForm] = useState(emptyForm);
  const { id } = useParams();
  // load products
// load products (list)
async function loadProducts() {
  try {
    // axios returns { data: { success, data, total } } or similar
    const res = await adminApi.get("/products?limit=100");
    // normalize: some endpoints return { data: [...] } or { success: true, data: [...] }
    const body = res.data ?? {};
    const list = body.data ?? body.products ?? body.result ?? (Array.isArray(body) ? body : []);
    setProducts(list || []);
  } catch (err) {
    console.error("Failed to fetch products:", err);
    setProducts([]);
  }
}

// top 5
async function loadTopProducts() {
  try {
    const res = await adminApi.get("/products/top?limit=5");
    const body = res.data ?? {};
    const list = body.products ?? body.data ?? (Array.isArray(body) ? body : []);
    setTopProducts(list || []);
  } catch (err) {
    // 404 means no top endpoint implemented — keep empty
    if (err?.response?.status === 404) {
      console.debug("Top-products endpoint not available; skipping.");
      setTopProducts([]);
      return;
    }
    console.error("Failed to fetch top products:", err);
    setTopProducts([]);
  }
}
 
  useEffect(() => {
    loadProducts();
    loadTopProducts();
  }, []);

  // Form helpers (images & variants)
  function addImageRow() {
    setForm((f) => ({ ...f, images: [...(f.images || []), ""] }));
  }
  function updateImage(idx, val) {
    setForm((f) => {
      const imgs = [...(f.images || [])];
      imgs[idx] = val;
      return { ...f, images: imgs };
    });
  }
  function removeImage(idx) {
    setForm((f) => {
      const imgs = [...(f.images || [])];
      imgs.splice(idx, 1);
      return { ...f, images: imgs };
    });
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...(f.variants || []), { size: "", mrp: 0, sell_price: 0 }] }));
  }
  function updateVariant(idx, key, val) {
    setForm((f) => {
      const vs = [...(f.variants || [])];
      vs[idx] = { ...vs[idx], [key]: val };
      return { ...f, variants: vs };
    });
  }
  function removeVariant(idx) {
    setForm((f) => {
      const vs = [...(f.variants || [])];
      vs.splice(idx, 1);
      return { ...f, variants: vs };
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(p) {
    const images = [];
    if (Array.isArray(p.images)) {
      images.push(...p.images);
    } else {
      Object.keys(p).forEach((k) => {
        if (k.startsWith("images/")) images.push(p[k]);
      });
    }

    const variants =
      (p.variants && Array.isArray(p.variants))
        ? p.variants.map((v) => ({
            size: v.size ?? v.name ?? "",
            mrp: v.mrp ?? v.mrp,
            sell_price: v.sell_price ?? v.sell_price ?? v.sellPrice ?? v.price ?? 0,
            _id: v._id,
          }))
        : [];

    setForm({
      product_id: p.product_id || p.sku || "",
      product_name: p.product_name || p.name || "",
      category: p.category || "",
      colour: p.colour || "",
      gender: p.gender || "Women",
      description: p.description || "",
      images,
      newArrival: !!p.newArrival,
      bestSeller: !!p.bestSeller,
      variants,
      stock: p.stock ?? 0,
    });
    setEditingId(p._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // create or update
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        product_id: form.product_id,
        product_name: form.product_name,
        category: form.category,
        colour: form.colour,
        gender: form.gender,
        description: form.description,
        // If images contain File objects you likely need to upload them with multipart/form-data.
        // Here we simply send strings / file objects as-is - adapt if you implement file upload separately.
        images: form.images.filter((x) => !!x),
        newArrival: !!form.newArrival,
        bestSeller: !!form.bestSeller,
        variants: (form.variants || []).map((v) => ({
          size: v.size,
          mrp: Number(v.mrp) || 0,
          sell_price: Number(v.sell_price) || 0,
          ...(v._id ? { _id: v._id } : {}),
        })),
        stock: Number(form.stock) || 0,
      };

     if (editingId) {
     await adminApi.put(`/products/${editingId}`, payload);
    } else {
     await adminApi.post("/products", payload);
      }
      await loadProducts();
      await loadTopProducts();
      resetForm();
    } catch (err) {
      console.error("Save error:", err);
      alert("Save failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    try {
      await adminApi.delete(`/products/${id}`);
      await loadProducts();
      await loadTopProducts();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed. Check console.");
    }
  }

  return (
    <div className=" ml-64 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Products</h1>
        </div>

        <div className="productPage grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* left: add/edit form */}
          <div className="lg:col-span-1 bg-white p-4 rounded shadow-sm">
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
              <FiPlusCircle /> {editingId ? "Edit Product" : "Add Product"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-[2%]">
              <div className="productIdBox" >
                <label className="block text-sm text-slate-600 mb-1">Product ID (SKU)</label>
                <input className="w-[30%] border rounded px-3 py-2" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}  style={{borderRadius:"8px", minHeight:"40px"}}/>
              </div>

              <div className="productNameBox">
                <label className="block text-sm text-slate-600 mb-1">Product Name</label>
                <input className="w-[30%] border rounded px-3 py-2" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required style={{borderRadius:"8px", minHeight:"40px"}}/>
              </div>

              <div className="grid grid-cols-2 gap-[2%]">
                <div className="categoryBox">
                  <label className="block text-sm text-slate-600 mb-1">Category</label>
                  <input className="w-[30%] border rounded px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}}/>
                </div>
                <div className="colorBox">
                  <label className="block text-sm text-slate-600 mb-1">Colour</label>
                  <input className="w-[30%] border rounded px-3 py-2" value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}}/>
                </div>
              </div>

              <div className="genderINPUT">
                <label className="block text-sm text-slate-600 mb-1">Gender</label>
                <select className="w-[30%] border rounded px-3 py-2" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}style={{borderRadius:"8px", minHeight:"40px"}}>
                  <option>Women</option>
                  <option>Men</option>
                  
                </select>
              </div>

              <div className="descrptionBox">
                <label className="block text-sm text-slate-600 mb-1">Description</label>
                <textarea className="w-[30%] border rounded px-3 py-2" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}}/>
              </div>

              {/* Images as URLs (quick) */}
              <div className="imageInput">
                <label className="block text-sm text-slate-600 mb-1">Images (URLs)</label>
      {form.images.map((file, i) => (
      <div key={i} className="grid gap-[2%] mb-2 items-center">
      <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) updateImage(i, selectedFile);
      }}
      />
      <div> 
      <button type="button" className="p-[2%] bg-[#FF460A] text-center text-[#fff] border-0 cursor-pointer w-[5%] mb-[1%] " onClick={() => removeImage(i)} style={{maxHeight:"5px"}}>
      <FiMinus />
      </button> </div>
      {file && typeof file === "object" && (
      <span className="text-xs">{file.name}</span>
      )}
     </div>
     ))} 
        <div className="grid space-y-[2%] items-center"> 

        <div> <button type="button" onClick={() => addImageRow()} className="text-sm text-indigo-600 inline-flex items-center gap-[1%] border-0 cursor-pointer bg-[#24B1C7] text-[#fff] "><FiPlus /> Add Image  </button> </div>
         <div><button type="button" onClick={addImageRow} className="text-sm text-indigo-600 inline-flex items-center gap-[1%] border-0 cursor-pointer bg-[#24B1C7] text-[#fff]"><FiPlus /> Add Image</button></div>
         <div> <button type="button" onClick={addImageRow} className="text-sm text-indigo-600 inline-flex items-center gap-[1%] border-0 cursor-pointer bg-[#24B1C7] text-[#fff]"><FiPlus /> Add Image</button></div>           
         <div> <button type="button" onClick={addImageRow} className="text-sm text-indigo-600 inline-flex items-center gap-[1%] border-0 cursor-pointer bg-[#24B1C7] text-[#fff]"><FiPlus /> Add Image</button></div>

        </div>     
          <div className="text-xs text-slate-400 mt-[2%] ">Use public URL or /images/ path</div>        
          </div>         
               
                 
                  
                  
                  

              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.newArrival} onChange={(e) => setForm({ ...form, newArrival: e.target.checked })} /> New Arrival
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.bestSeller} onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })} /> Best Seller
                </label>
              </div>

              {/* variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Variants</label>
                  <button type="button" onClick={addVariant} className="text-sm bg-[#D80EE3] text-[#fff] border-0 cursor-pointer inline-flex items-center gap-1"><FiPlus /> Add Variant</button>
                </div>

                {(form.variants || []).length === 0 && <div className="text-xs text-slate-400 mb-2">No variants defined — add sizes and prices here.</div>}

                <div className="space-y-2">
                  {(form.variants || []).map((v, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input className="col-span-3 border rounded px-2 py-1" placeholder="Size" value={v.size} onChange={(e) => updateVariant(i, "size", e.target.value)} />
                      <input className="col-span-4 border rounded px-2 py-1" placeholder="MRP" type="number" value={v.mrp} onChange={(e) => updateVariant(i, "mrp", e.target.value)} />
                      <input className="col-span-4 border rounded px-2 py-1" placeholder="Sell Price" type="number" value={v.sell_price} onChange={(e) => updateVariant(i, "sell_price", e.target.value)} />
                      <button type="button" className="col-span-1 text-red-600" onClick={() => removeVariant(i)}><FiMinus /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Total Stock</label>
                <input type="number" className="w-[10%] border rounded px-3 py-2" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{borderRadius:"8px", minHeight:"40px"}} />
              </div>

              <div className="flex gap-[1%]">
                <button type="submit" disabled={loading} className="bg-[#24B1C7] text-[#fff] cursor-pointer border-0 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
                  {loading ? "Saving..." : editingId ? "Update Product" : "Add Product"}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 border-0 bg-[#E31010] text-[#fff] cursor-pointer rounded hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>

          {/* right: list & top 5 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product list */}
            <div className="allProducts bg-white p-4 rounded shadow-sm">
              <h2 className="text-lg font-medium mb-4">All Products</h2>
              <div className="divide-y space-y-[4%] ">
                {products.length === 0 && <div className="text-sm text-slate-400 py-[5%] mb-[5%] ">No products found.</div>}

                {products.map((p) => (
                  <div key={p._id} className="allProductsWrap flex items-start justify-between border py-3 w-[60%]" style={{borderRadius:"8px"}}>
                    <div className="w-3/4 flex gap-[3%] space-y-[5%] items-start"style={{boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"}}>
                      {/* thumbnail (first image if available) */}
                      <div style={{ width: 72, height: 72, flex: "0 0 72px", borderRadius: 4, overflow: "hidden", background: "#f5f5f5" }}>
                        {p.images && p.images[0] ? (
                          <img src={p.images[0]} alt={p.product_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div className="text-xs text-slate-400 mt-[2%]">No image</div>
                        )}
                      </div>

                      <div className="">
                        <Link to={`/admin/products/${p._id}`}className="font-semibold text-lg text-[#001f3f] no-underline">{p.product_name || p.name || "(no name)"}</Link> 
                        <div className="text-sm text-slate-500">
                          <p>{p.category} • {p.gender}</p>  • Stock: {p.stock ?? 0} 
                        </div>

                        {p.variants?.length > 0 && (
                          <div className="text-xs text-slate-400 mt-2">
                            <strong>Variants:</strong>{" "}
                            {p.variants
                              .map((v) => `${v.size ?? v.name} (${formatCurrency(v.sell_price ?? v.price ?? v.rate ?? 0)} / stock:${v.stock ?? 0})`)
                              .join(", ")}
                          </div>
                        )}

                        
                      </div>
                    </div>

                    <div className="flex items-center gap-[3%] mr-[2%] mt-[1%] ">
                      <button onClick={() => startEdit(p)} className="p-2 rounded hover:bg-slate-100  bg-[#E69A29] text-[#fff] shadow-none border-0 cursor-pointer" title="Edit"style={{ minHeight:"30px"}}><FiEdit /></button>
                      <button onClick={() => handleDelete(p._id)} className="p-2 rounded hover:bg-red-50 bg-[#E31010] text-[#fff] shadow-none border-0 cursor-pointer" title="Delete"style={{ minHeight:"30px"}}><FiTrash2 /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 omitted (commented out) */}
          </div>
        </div>
      </div>
    </div>
  );
}
