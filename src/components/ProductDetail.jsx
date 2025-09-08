// src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaHeart,
  FaShare,
} from "react-icons/fa";
import PrimaryButton from "./PrimaryButton";
import ProductZoom from "./ProductZoom";
import { useCart } from "../context/CartContext";
import { MdOutlineShoppingCart } from "react-icons/md";

const BACKEND_HOST = import.meta.env.VITE_API_HOST || "http://localhost:5000";
const BRAND = "#001f3f";

/* ----------------- Helpers ----------------- */
const normalizeImageUrl = (img) => {
  if (img === undefined || img === null) return "";
  const s = String(img).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith("/") ? `${BACKEND_HOST}${s}` : `${BACKEND_HOST}/${s}`;
};

const extractMongoIdString = (maybeId) => {
  if (!maybeId) return null;
  if (typeof maybeId === "string") return maybeId;
  if (maybeId && typeof maybeId === "object") {
    if (maybeId.$oid) return maybeId.$oid;
    if (typeof maybeId.toString === "function") {
      try {
        const s = maybeId.toString();
        if (s && s !== "[object Object]") return s;
      } catch {}
    }
  }
  return String(maybeId);
};
const collectImages = (obj) => {
  if (!obj) return [];
  if (Array.isArray(obj.images) && obj.images.length) {
    return obj.images.filter(Boolean).map((i) => String(i));
  }

const imageEntries = Object.keys(obj)
  .map((k) => {
    const m = k.match(/^images\/(\d+)$/);
    if (m) return { key: k, idx: Number(m[1]) };
    return null;
    })
    .filter(Boolean);

  if (!imageEntries.length) return [];

  imageEntries.sort((a, b) => a.idx - b.idx);
  return imageEntries.map((e) => String(obj[e.key]).trim()).filter(Boolean);
};

/**
 * Accepts the raw product object (possibly malformed from older CSV import)
 * and returns a normalized product:
 *  - images: Array<string>
 *  - variants: Array<{ size, mrp, sell_price, stock?, _id? }>
 *  - fallback top-level mrp/sell_price mapped to variant if variants missing
 */
const normalizeRawProduct = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const p = { ...raw };

  // 1) Normalize images:
  let images = [];
  if (Array.isArray(p.images) && p.images.length) images = p.images.slice();
  else {
    // collect keys like 'images/0', 'images/1' (CSV/flattened)
    const imgKeys = Object.keys(p).filter((k) => /^images\/\d+$/.test(k));
    if (imgKeys.length) {
      imgKeys.sort((a, b) => {
        const ia = Number(a.split("/")[1]);
        const ib = Number(b.split("/")[1]);
        return ia - ib;
      });
      images = imgKeys.map((k) => p[k]).filter(Boolean);
    }
  }
  images = images.map(normalizeImageUrl).filter(Boolean);

  // 2) Normalize variants:
  let variants = [];
  if (Array.isArray(p.variants) && p.variants.length) {
    variants = p.variants.map((v) => ({ ...v }));
  } else {
    // handle flattened variant keys like variants/0/size etc.
    const variantIndexSet = new Set();
    Object.keys(p).forEach((k) => {
      const m = k.match(/^variants\/(\d+)\/(.+)$/);
      if (m) variantIndexSet.add(Number(m[1]));
    });

    if (variantIndexSet.size) {
      const indexes = Array.from(variantIndexSet).sort((a, b) => a - b);
      variants = indexes
        .map((i) => {
          const size = p[`variants/${i}/size`] ?? p[`variants/${i}/Size`] ?? null;
          const mrp = p[`variants/${i}/mrp`] ?? p[`variants/${i}/MRP`] ?? null;
          const sell_price = p[`variants/${i}/sell_price`] ?? p[`variants/${i}/sellPrice`] ?? null;
          return {
            size: size ? String(size).trim() : undefined,
            mrp: mrp !== undefined && mrp !== null ? Number(mrp) : undefined,
            sell_price: sell_price !== undefined && sell_price !== null ? Number(sell_price) : undefined,
          };
        })
        .filter(Boolean);
    }
  }

  // 3) Fallback: if no variants but top-level mrp / sell_price exist, synthesize a variant
  if ((!variants || variants.length === 0) && (p.mrp !== undefined || p.sell_price !== undefined)) {
    variants = [
      {
        size: p.size ?? "ONE",
        mrp: p.mrp !== undefined ? Number(p.mrp) : undefined,
        sell_price: p.sell_price !== undefined ? Number(p.sell_price) : undefined,
      },
    ];
  }

  // 4) Ensure variant size capitalization/trimming
  variants = variants.map((v) => {
    const copy = { ...v };
    if (copy.size && typeof copy.size === "string") copy.size = copy.size.trim().toUpperCase();
    if (copy.mrp !== undefined) copy.mrp = typeof copy.mrp === "number" ? copy.mrp : Number(copy.mrp ?? NaN);
    if (copy.sell_price !== undefined) copy.sell_price = typeof copy.sell_price === "number" ? copy.sell_price : Number(copy.sell_price ?? NaN);
    return copy;
  });

  // 5) Build cheapestVariant helper
  let cheapestVariant = null;
  for (const v of variants) {
    if (!cheapestVariant) cheapestVariant = v;
    else {
      const a = v.sell_price ?? Number.POSITIVE_INFINITY;
      const b = cheapestVariant.sell_price ?? Number.POSITIVE_INFINITY;
      if (a < b) cheapestVariant = v;
    }
  }

  return {
    ...p,
    images,
    variants,
    cheapestVariant,
  };
};

/* ----------------- Component ----------------- */
export default function ProductDetail() {
  const { id } = useParams(); // id may be product_id, slug, or Mongo _id
  const navigate = useNavigate();

  const [rawProduct, setRawProduct] = useState(null);
  const [product, setProduct] = useState(null); // normalized
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const { cartItems, setCartItems } = useCart();
  const [zoomed, setZoomed] = useState(false);

  // UI state
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const addToCart = (p) => {
    const id = p.id ?? p.product_id??extractMongoIdString(p._id);;
    const name = p.name?? p.product_name ?? "Unnamed Product";
    const price = Number(p.displayPrice ?? p.price ?? p.sell_price ?? p.mrp ?? 0);
    const image = p.main_image ?? p.image ?? (Array.isArray(p.images) ? p.images[0] : "");
    const selectedSize =
      p.size ??
      (Array.isArray(p.variants) ? p.variants[selectedVariantIndex]?.size : undefined) ??
      p?.cheapestVariant?.size ??
      null;
    if (!id) return;
    setCartItems((prev) => {
      const existing = prev.find((it) => it.id === id);
      if (existing) {
        return prev.map((it) => (it.id === id ? { ...it, qty: (it.qty || 0) + 1 } : it));
      }
      return [...prev, { id, name, price, image, qty: 1, size: selectedSize || "One Size" }];
    });
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setRawProduct(null);
      setProduct(null);
      setSelectedVariantIndex(0);

      try {
        const endpoint = `${BACKEND_HOST}/api/products/${encodeURIComponent(id)}`;
        const res = await fetch(endpoint);
        // prefer structured response { success: true, data: product }
        let json = null;
        try { json = await res.json(); } catch (e) { /* ignore parse error */ }

        let fetched = null;
        if (json && json.success === true && json.data) fetched = json.data;
        else if (json && Array.isArray(json)) fetched = json; // unlikely for single
        else if (res.ok && json) fetched = json.data ?? json; // fallback

        // If server gave single product object, use it
        if (fetched && typeof fetched === "object" && !Array.isArray(fetched)) {
          if (mounted) {
            setRawProduct(fetched);
            const norm = normalizeRawProduct(fetched);
            setProduct(norm);
            // default variant selection: cheapest or first
            if (norm?.variants?.length) {
              const idx = norm.variants.findIndex((v) => v === norm.cheapestVariant);
              setSelectedVariantIndex(idx >= 0 ? idx : 0);
            }
            setLoading(false);
          }
          return;
        }

        // fallback: fetch list and match product_id OR _id
        const listRes = await fetch(`${BACKEND_HOST}/api/products`);
        if (!listRes.ok) throw new Error(`Products list failed with ${listRes.status}`);
        const listJson = await listRes.json();
        const arr = Array.isArray(listJson) ? listJson : listJson?.data ?? [];

        const lowerId = id ? String(id).trim().toLowerCase() : "";
        const found = arr.find((it) => {
          const pid = (it.product_id ?? "").toString().trim().toLowerCase();
          if (pid && pid === lowerId) return true;
          const slug = (it.slug ?? "").toString().trim().toLowerCase();
          if (slug && slug === lowerId) return true;
          const _idStr = extractMongoIdString(it._id) || "";
          if (_idStr && _idStr.toString().trim().toLowerCase() === lowerId) return true;
          return false;
        });

        if (!found) {
          if (mounted) setError("Product not found");
        } else {
          if (mounted) {
            setRawProduct(found);
            const norm = normalizeRawProduct(found);
            setProduct(norm);
            if (norm?.variants?.length) {
              const idx = norm.variants.findIndex((v) => v === norm.cheapestVariant);
              setSelectedVariantIndex(idx >= 0 ? idx : 0);
            }
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("ProductDetail load error:", err);
        if (mounted) setError("Failed to load product. Check server logs.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  // Load similar products (same category and gender), exclude current
  useEffect(() => {
    let mounted = true;
    async function loadSimilar() {
      if (!product) return;
      setLoadingSimilar(true);
      try {
        const res = await fetch(`${BACKEND_HOST}/api/products`);
        const listJson = await res.json().catch(() => null);
        const arr = Array.isArray(listJson) ? listJson : listJson?.data ?? [];

        const normalized = arr
          .map((p) => normalizeRawProduct(p))
          .filter(Boolean);

        const currentId = product.product_id ?? extractMongoIdString(product._id);
        const targetCategory = (product.category ?? "").toString().trim().toLowerCase();
        const targetGender = (product.gender ?? "").toString().trim().toLowerCase();

        const sims = normalized
          .filter((p) => {
            const pid = p.product_id ?? extractMongoIdString(p._id);
            if (pid && currentId && String(pid) === String(currentId)) return false;
            const pc = (p.category ?? "").toString().trim().toLowerCase();
            const pg = (p.gender ?? "").toString().trim().toLowerCase();
            if (targetCategory && pc !== targetCategory) return false;
            if (targetGender && pg !== targetGender) return false;
            return true;
          })
          .slice(0, 6);

        if (mounted) setSimilarProducts(sims);
      } catch (e) {
        if (mounted) setSimilarProducts([]);
      } finally {
        if (mounted) setLoadingSimilar(false);
      }
    }

    loadSimilar();
    return () => { mounted = false; };
  }, [product]);

  // Actions

  const handleDelete = async () => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const identifier = product?.product_id ?? extractMongoIdString(product?._id);
      if (!identifier) throw new Error("No identifier found for product");
      const res = await fetch(`${BACKEND_HOST}/api/products/${encodeURIComponent(identifier)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Product deleted");
        navigate("/products");
      } else {
        const json = await res.json().catch(() => null);
        alert(`Delete failed: ${json?.message ?? res.statusText}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete error, check console");
    }
  };

  const handleEdit = () => {
    const pid = product?.product_id ?? extractMongoIdString(product?._id);
    if (!pid) return alert("No product id to edit");
    navigate(`/edit-product/${encodeURIComponent(pid)}`);
  };

  /* ----------------- Render states ----------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-[#001f3f] mx-auto mb-4" />
          <div className="text-gray-600">Loading product...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="text-red-600 font-bold mb-3">⚠️ {error}</div>
          <div className="flex justify-center gap-3">
            <PrimaryButton onClick={() => navigate("/")}>Back</PrimaryButton>
            <PrimaryButton onClick={() => window.location.reload()} className="bg-gray-100 text-gray-800 border-gray-100 hover:bg-gray-200 hover:border-gray-200">Reload</PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const variants = product.variants ?? [];
  const selectedVariant = variants[selectedVariantIndex] ?? null;
  console.log('Selected variant index:', selectedVariantIndex);
  console.log('Selected variant:', selectedVariant);
  console.log('All variants:', variants);
  const displayPrice = selectedVariant?.sell_price ?? selectedVariant?.mrp ?? product.sell_price ?? product.mrp ?? null;
  const displayMrp = selectedVariant?.mrp ?? product.mrp ?? null;
  const discountPct = (displayMrp && displayPrice && displayMrp > displayPrice)
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;
  const savedAmount = (displayMrp && displayPrice && displayMrp > displayPrice) ? (displayMrp - displayPrice) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* layout */}
      <div className="grid grid-cols-2  gap-8">
        {/* left: images */}
        <div className="flex items-start space-x-8">
          {console.log('Product images:', product.images)}
          <ProductZoom 
            images={product.images ? product.images.map(normalizeImageUrl) : []} 
            productName={product.product_name || product.product_id || "Product"} 
          />
        </div>

        {/* right: details */}
        <div className="discription flex-1 space-y-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#001f3f]">{product.product_name}</h1>
            <div className="mt-1 text-sm text-gray-500">ID: {product.product_id ?? extractMongoIdString(product._id)}</div>
          </div>

          {/* price area */}
         <div className="bg-white p-4 rounded-lg shadow-sm ">
         <div className="flex items-baseline gap-4 mb-[2%] ">

          {/* Case 1: No discount → only MRP */}
          {displayMrp && displayMrp === displayPrice && (
         <div
        className="text-3xl font-extrabold text-[#001f3f]"
        style={{ fontWeight: 700, fontSize: "2rem" }}
         >
         ₹{displayMrp.toLocaleString()}
        </div>
             )}

      {/* Case 2: Discounted → MRP line-through + final price */}
            {displayMrp && displayMrp !== displayPrice && (
        <>
        <div className="text-sm text-gray-500 line-through">
          ₹{displayMrp.toLocaleString()}
        </div>
        <div
          className="text-3xl font-extrabold text-[#001f3f]"
          style={{ fontWeight: 700, fontSize: "2rem" }}
        >
          ₹{displayPrice?.toLocaleString() ?? "N/A"}
        </div>
         </>
          )}
        </div>

            {savedAmount > 0 && (
              <div className="text-sm text-gray-600 mt-2">You save ₹{savedAmount.toLocaleString()}</div>
            )}
          </div>

          {/* size selector (variants) */}
          <div className="bg-white p-4 rounded-lg ">
            <div className="text-gray-500 mb-2" >Select Size</div>
            <div className="flex flex-wrap " style={{ gap:"15px" }} >
              {variants.length ? (
                variants.map((v, idx) => {
                  const isSelected = idx === selectedVariantIndex;
                  return (
                    <button
                      key={v.size ?? idx}
                      type="button"
                      onClick={() => {
                        console.log('Button clicked, setting index to:', idx);
                        setSelectedVariantIndex(idx);
                      }}
                      className={`px-4 py-2 rounded border  font-semibold ${isSelected ? "bg-[#001f3f] text-[#ffffff]" : "bg-[#ffffff] text-[#001f3f]"}`}
                        style={{borderRadius:"5px", minWidth:"60px", minHeight:"40px"}}>
                      {v.size ?? "ONE"}
                    </button>
                  );
                })
              ) : (
                <div className="text-gray-500">No sizes available</div>
              )}
            </div>
          </div>

          {/* specs grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className=" bg-white p-3 rounded-lg ">
              <p className="text-sm text-[#001f3f]" style={{fontWeight:650, fontSize:"1rem"}}>Category:</p>
              <p className="font-medium">{product.category ?? "N/A"}</p>
            </div>
            <div className="bg-white p-3 rounded-lg ">
              <p className="text-sm text-[#001f3f]" style={{fontWeight:650, fontSize:"1rem"}}>Color:</p>
              <p className="font-medium">{product.colour ?? "N/A"}</p>
            </div>
            <div className="bg-white p-3 rounded-lg ">
              <p className="text-sm text-[#001f3f]" style={{fontWeight:650, fontSize:"1rem"}}>Gender:</p>
              <p className="font-medium capitalize">{product.gender ?? "N/A"}</p>
            </div>
            <div className="bg-white p-3 rounded-lg ">
              <p className="text-sm text-[#001f3f]" style={{fontWeight:650, fontSize:"1rem"}}>Images:</p>
              <p className="font-medium">{product.images?.length ?? 0}</p>
            </div>
          </div>

          {/* description */}
          <div className="bg-white p-4 rounded-lg ">
            <p className="text-sm text-[#001f3f]" style={{fontWeight:650, fontSize:"1rem"}}>Description:</p>
            <p className="font-medium whitespace-pre-line text-[#808080] " style={{fontSize:"0.9rem"}}>{product.description ?? "N/A"}</p>
            <p className="text-[#808080] " >Model is wearing size XS with a height of 5'5" </p>
            <p className="text-[#808080] " > CARE : Gentle machine wash or Handwash preferred . </p>
           <div      
            className={` cursor-pointer transition-transform duration-300 ${
             zoomed ? "scale-230 " : "scale-100"
             }`}
             onClick={() => setZoomed(!zoomed)}
             > 
             <img className="w-[20%] text-[#808080] " src="../images/sizechart.png" /></div> 
             <p className="text-[#808080]  "style={{fontSize:"0.9rem"}}>click to view</p>

          </div>

          {/* actions */}
          <div className="flex gap-3 items-center">
            <PrimaryButton   onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart({
               id: product.product_id ?? extractMongoIdString(product._id),
              name: product.product_name,
              price: displayPrice,
              image: product.images?.[0] ?? "",
              size: selectedVariant?.size ?? null,
            }); }} 
             className="flex-1 py-3">Add to Cart</PrimaryButton>
            
            <button className="px-4 py-3 rounded bg-gray-100"><FaShare className="text-lg" /></button>
          </div>

          {/* extra info 
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 mb-8">
            <p><strong>Product ID:</strong> {product.product_id}</p>
            <p><strong>Added:</strong> {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : "—"}</p>
            <p><strong>Last updated:</strong> {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : "—"}</p>
            <p><strong>Variant:</strong> {selectedVariant ? `${selectedVariant.size} — ₹${(selectedVariant.sell_price ?? selectedVariant.mrp ?? "N/A").toLocaleString()}` : "—"}</p>
          </div>*/}
        </div>
      </div>

      {/* Similar Products */}
      <div className="mt-12">
        <h2 className="text-2xl text-center font-bold text-[#001f3f] mb-4">Similar Products</h2>
        {loadingSimilar ? (
          <div className="text-gray-600">Loading similar products...</div>
        ) : similarProducts.length === 0 ? (
          <div className="text-gray-500">No similar products found.</div>
        ) : (
          
          <div className="grid grid-cols-4 md:grid-cols-3 lg:grid-cols-6 " style={{gap:"25px"}}>
            {similarProducts.slice(0,4).map((sp) => {
              const pid = sp.product_id ?? extractMongoIdString(sp._id);
              const img = (sp.images && sp.images.length) ? normalizeImageUrl(sp.images[0]) : "";
              const variant = sp.cheapestVariant ?? sp.variants?.[0] ?? null;
              const price = variant?.sell_price ?? variant?.mrp ?? sp.sell_price ?? sp.mrp ?? null;
              const mrp = variant?.mrp ?? sp.mrp ?? null;
              return (
                <Link key={pid} to={`/product/${encodeURIComponent(pid)}`} className=" rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow no-underline text-current ">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {img ? (
                      
                      <img src={img} alt={sp.product_name || pid} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className=" text-[#001f3f] font-semibold line-clamp-2 h-10" style={{fontWeight:600}}>{sp.product_name || pid}</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <div className="text-[#001f3f] font-bold"style={{fontWeight:500, fontSize:"1.5rem"}}>{price !== null ? `₹${Number(price).toLocaleString()}` : "N/A"}</div>
                      {mrp && mrp !== price && (
                        <div className="text-xs text-gray-500 line-through">₹{Number(mrp).toLocaleString()}</div>
                      )}
                    </div>
                        <div className="mt-2 flex justify-center">
                          <PrimaryButton
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart({ id: pid, product_id: pid, name: sp.product_name || pid, price: price ?? 0, image: img, images: sp.images || [], main_image: img }); }}
                            className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-1">
                                     
                            <MdOutlineShoppingCart className="text-xs" />
                            Add to Cart
                          </PrimaryButton>
                        </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
