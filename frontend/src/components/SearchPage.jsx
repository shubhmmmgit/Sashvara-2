// src/components/SearchPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { MdOutlineShoppingCart } from "react-icons/md";
import { useCart } from "../context/CartContext";
import PrimaryButton from "./PrimaryButton";
import { Swiper, SwiperSlide } from "swiper/react";
import { imageUrl } from '../utils/imageUrl';

const BACKEND_HOST = import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com";

/* ---------- Utilities ---------- 

// Normalize image URLs
const normalizeImageUrl = (img) => {
  if (!img) return "";
  const s = String(img).trim();
  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return `${BACKEND_HOST}${s}`;
  return `${BACKEND_HOST}/images/${s}`;
};*/

// Extract product_id
const extractProductId = (p) => {
  if (!p) return null;
  if (p.product_id) return String(p.product_id);
  if (p.productId) return String(p.productId);
  if (p.id) return String(p.id);
  if (p._id) {
    if (typeof p._id === "object" && p._id.$oid) return String(p._id.$oid);
    return String(p._id);
  }
  return null;
};

// Collect images from either images[] or flattened images/0, images/1...
const collectImages = (obj) => {
  if (!obj || typeof obj !== "object") return [];

  // 1️⃣ If obj.images is an array
  if (Array.isArray(obj.images) && obj.images.length) {
    return obj.images
      .map((it) => (typeof it === "string" ? it : it?.url || it?.src || ""))
      .filter(Boolean)
      .map((i) => String(i).trim());
  }

  // 2️⃣ If obj has keys like images/0, images/1
  const imageEntries = Object.keys(obj)
    .filter((k) => /^images\/\d+$/.test(k))
    .sort((a, b) => Number(a.split("/")[1]) - Number(b.split("/")[1]))
    .map((k) => obj[k])
    .filter(Boolean)
    .map((i) => String(i).trim());

  return imageEntries;
};


// Collect variants from either variants[] or flattened variants/0/size, etc.
const collectVariants = (obj) => {
  if (!obj) return [];
  if (Array.isArray(obj.variants) && obj.variants.length) return obj.variants;

  const rows = {};
  for (const k of Object.keys(obj)) {
    const m = k.match(/^variants\/(\d+)\/(.+)$/); // e.g. variants/0/size
    if (m) {
      const idx = Number(m[1]);
      const field = m[2];
      rows[idx] = rows[idx] || {};
      rows[idx][field] = obj[k];
    }
  }

  return Object.values(rows).map((r) => ({
    size: r.size,
    mrp: r.mrp ? Number(r.mrp) : undefined,
    sell_price: r.sell_price ? Number(r.sell_price) : undefined,
  }));
};

// Compute cheapest variant
const cheapestVariant = (variants = []) => {
  if (!variants.length) return null;
  return variants.reduce((a, b) =>
    Number(b.sell_price ?? Infinity) < Number(a.sell_price ?? Infinity) ? b : a
  );
};

// Extract MongoDB ID string
const extractMongoIdString = (id) => {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (typeof id === "object" && id.$oid) return id.$oid;
  return String(id);
};

// Normalize raw product (for similar products)
const normalizeRawProduct = (raw) => {
  if (!raw) return null;

  const images = collectImages(raw);
  const variants = collectVariants(raw);
  const cheapest = cheapestVariant(variants);

  const sell_price = cheapest?.sell_price ?? raw.sell_price ?? null;
  const mrp = cheapest?.mrp ?? raw.mrp ?? null;

  const displayPrice = sell_price ?? mrp ?? null;
  const displayMrp = mrp && mrp !== sell_price ? mrp : null;

  const pid = extractProductId(raw);

  return {
    raw,
    product_id: pid,
    id: pid ?? raw._id,
    name: raw.product_name ?? raw.title ?? raw.name ?? pid ?? "Unnamed product",
    images: images.map(imageUrl),
    main_image: images.length ? imageUrl(images[0]) : "",
    variants,
    sizesAvailable: variants.map((v) => v.size).filter(Boolean),
    displayPrice,
    displayMrp,
    cheapestVariant: cheapest,
    category: raw.category,
    gender: raw.gender,
  };
};

// Normalize product
const normalizeProduct = (raw) => {
  if (!raw) return null;

  const images = collectImages(raw);
  const variants = collectVariants(raw);
  const cheapest = cheapestVariant(variants);

  const sell_price = cheapest?.sell_price ?? raw.sell_price ?? null;
  const mrp = cheapest?.mrp ?? raw.mrp ?? null;

  const displayPrice = sell_price ?? mrp ?? null;
  const displayMrp = mrp && mrp !== sell_price ? mrp : null;

  const pid = extractProductId(raw);

  return {
    raw,
    product_id: pid,
    id: pid ?? raw._id,
    name: raw.product_name ?? raw.title ?? raw.name ?? pid ?? "Unnamed product",
    images: images.map(imageUrl),
    main_image: images.length ? imageUrl(images[0]) : "",
    variants,
    sizesAvailable: variants.map((v) => v.size).filter(Boolean),
    displayPrice,
    displayMrp,
  };
};

/* ---------- Component ---------- */

export default function SearchPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const { cartItems, setCartItems } = useCart();
  const [searchParams] = useSearchParams();
  
  // Get search query from URL parameters
  const searchQuery = searchParams.get('q');

  const addToCart = (p) => {
    const id = p.id ?? p.product_id;
    const name = p.name;
    const price = Number(p.displayPrice || 0);
    const image = p.main_image || "";
    if (!id) return;
    setCartItems((prev) => {
      const existing = prev.find((it) => it.id === id);
      if (existing) {
        return prev.map((it) => (it.id === id ? { ...it, qty: (it.qty || 0) + 1 } : it));
      }
      return [...prev, { id, name, price, image, qty: 1 }];
    });
  };

  // Load search results
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!searchQuery) {
          if (mounted) {
            setItems([]);
            setError(null);
          }
          return;
        }

        const params = new URLSearchParams();
        params.set("q", searchQuery);

        const endpoint = "/api/products/search";
        const url = `${BACKEND_HOST}${endpoint}?${params}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const rawItems = json?.data && Array.isArray(json.data) ? json.data : [];

        if (!rawItems.length) {
          if (mounted) {
            setItems([]);
            setError(null);
          }
          return;
        }

        const normalized = rawItems.map(normalizeProduct).filter(Boolean);
        if (mounted) setItems(normalized);
      } catch (err) {
        console.error("SearchPage fetch error:", err);
        if (mounted) setError("Failed to load search results");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  // Load similar products
  useEffect(() => {
    let mounted = true;
    async function loadSimilar() {
      if (!searchQuery || items.length === 0) return;
      
      setLoadingSimilar(true);
      try {
        const res = await fetch(`${BACKEND_HOST}/api/products`);
        const listJson = await res.json().catch(() => null);
        const arr = Array.isArray(listJson) ? listJson : listJson?.data ?? [];

        const normalized = arr
          .map((p) => normalizeRawProduct(p))
          .filter(Boolean);

        // Get the first search result as reference for similar products
        const firstItem = items[0];
        if (!firstItem) return;

        const currentId = firstItem.product_id ?? extractMongoIdString(firstItem.raw._id);
        const targetCategory = (firstItem.raw.category ?? "").toString().trim().toLowerCase();
        const targetGender = (firstItem.raw.gender ?? "").toString().trim().toLowerCase();

        const sims = normalized
          .filter((p) => {
            const pid = p.product_id ?? extractMongoIdString(p.raw._id);
            if (pid && currentId && String(pid) === String(currentId)) return false;
            const pc = (p.raw.category ?? "").toString().trim().toLowerCase();
            const pg = (p.raw.gender ?? "").toString().trim().toLowerCase();
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
  }, [searchQuery, items]);

  if (loading)
    return (
      <div className="py-8 flex items-center justify-center">
        <FaSpinner className="animate-spin text-3xl text-[#001f3f]" />
      </div>
    );

  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;
  
  if (!searchQuery) {
    return (
      <div className="py-8 text-center text-gray-600">
        <h2 className="text-xl font-semibold mb-2">No search query</h2>
        <p>Please enter a search term to find products.</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-8 text-center text-gray-600">
        <h2 className="text-xl font-semibold mb-2">No products found</h2>
        <p>No products found for "{searchQuery}". Try a different search term.</p>
      </div>
    );
  }


  return (
    <section className="py-6 w-full">
      {/* Search Results Header */}
      <div className="mb-6 px-4 ">
        <h2 className="text-2xl text-center font-semibold text-[#001f3f]">
          Search results for "{searchQuery}"
        </h2>
        <div className="ml-[15%] mr-[15%] " >
        <p className="text-[#001f3f] text-center border-b  mt-1 ">
          {items.length} product{items.length !== 1 ? 's' : ''} found 
        </p>
        </div>
      </div>
       
      {/* Compact Product Grid */}
      <div className="grid gap-3 grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 w-[97%] ">
        
        {items.map((p) => (
          <Link
            key={p.id ?? p.product_id}
            to={`/product/${encodeURIComponent(p.product_id ?? p.id ?? "")}`}
            className="block group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow no-underline hover:no-underline "
          >
            {/* Product Image */}
            <div className=" bg-gray-100 aspect-[9/16] overflow-hidden flex items-center justify-center ml-[10%]   " >
              {p.main_image ? (
                <img
                  src={p.main_image}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 items-centergap-[10%] " 
                />
              ) : (
                <div className="text-gray-400 text-xl">📦</div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-2">
              <div className="text-xs font-semibold text-[#001f3f] text-center whitespace-normal break-words no-underline line-clamp-2 h-6 ">
                {p.name}
              </div>
              
              <div className="mt-1 flex items-baseline gap-1 justify-center gap-[1%] ">
                {p.displayMrp != null && (
                  <div className="text-xs text-gray-500 line-through  text-[#001f3f] hover:text-[#001f3f] visited:text-[#001f3f] ">
                    ₹{Number(p.displayMrp).toLocaleString()}
                  </div>
                )}
                <div className="text-sm font-bold text-[#001f3f]" style={{fontWeight:500, fontSize:"1.5rem"}}>
                  {p.displayPrice != null
                    ? `₹${Number(p.displayPrice).toLocaleString()}`
                    : "Price N/A"}
                </div>
              </div>

              <div className="mt-1 text-xs text-gray-500 text-center text-[#001f3f] hover:text-[#001f3f] visited:text-[#001f3f]">
                {p.sizesAvailable && p.sizesAvailable.length
                  ? `${p.sizesAvailable.length} size${p.sizesAvailable.length > 1 ? "s" : ""}`
                  : "Single size"}
              </div>
              
              <div className="mt-2 flex justify-center">
                <PrimaryButton
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(p); }}
                  className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-1 mb-[10%] "
                >
                  <MdOutlineShoppingCart className="text-xs" />
                  Add to Cart
                </PrimaryButton>
              </div>

            </div>
          </Link>
        ))}
         

      </div>

            <div className="mt-12">
              <h2 className="text-2xl text-center font-bold text-[#001f3f] mb-4">Similar Products</h2>
              {loadingSimilar ? (
                <div className="text-gray-600">Loading similar products...</div>
              ) : similarProducts.length === 0 ? (
                <div className="text-gray-500">No similar products found.</div>
              ) : (
                
                 <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 ml-[10%] mr-[10%] gap-4"  style={{gap:"25px"}}>
                   {similarProducts.slice(0,4).map((sp) => {
                     const pid = sp.product_id ?? extractMongoIdString(sp.raw._id);
                     const img = sp.main_image || "";
                     const price = sp.displayPrice;
                     const mrp = sp.displayMrp;
                     return (
                       <Link key={pid} to={`/product/${encodeURIComponent(pid)}`} className="rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow no-underline text-current">
                         <div className="aspect-square bg-gray-100 overflow-hidden">
                           {img ? (
                             <img src={imageUrl(img)} alt={sp.name || pid} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                           )}
                         </div>
                         <div className="p-3">
                           <div className="text-[#001f3f] text-center font-semibold line-clamp-2 h-10" style={{fontWeight:600}}>{sp.name || pid}</div>
                           <div className="mt-1 flex justify-center items-baseline gap-[2%] ">
                            {mrp && mrp !== price && (
                               <div className="text-xs text-gray-500 line-through">₹{Number(mrp).toLocaleString()}</div>
                             )}
                             <div className="text-[#001f3f] font-bold" style={{fontWeight:500, fontSize:"1.5rem"}}>{price !== null ? `₹${Number(price).toLocaleString()}` : "N/A"}</div>
                             
                           </div>
                         </div>
                        <div className="mt-2 flex justify-center">
                          <PrimaryButton
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(p); }}
                            className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-1">
                                     
                            <MdOutlineShoppingCart className="text-xs" />
                            Add to Cart
                          </PrimaryButton>
                         </div>
                       </Link>
                     );
                   })}
                 </div>
              )}
            </div>
    </section>
  );
}
