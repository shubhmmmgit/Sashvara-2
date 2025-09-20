// src/components/ProductList.jsx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { MdOutlineShoppingCart, MdShoppingBag } from "react-icons/md";
import { useCart } from "../context/CartContext";
import PrimaryButton from "./PrimaryButton";
import toast from "react-hot-toast";
import { fetchProducts } from "../api";
import { imageUrl } from "../utils/imageUrl";



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

// ✅ Collect variants from either variants[] or flattened variants/0/size, etc.
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

// ✅ Compute cheapest variant
const cheapestVariant = (variants = []) => {
  if (!variants.length) return null;
  return variants.reduce((a, b) =>
    Number(b.sell_price ?? Infinity) < Number(a.sell_price ?? Infinity) ? b : a
  );
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

export default function ProductList({ 
   gender = null,
   limit = 50, 
   category = null,
   newArrival = false,
   bestSeller = false, }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cartItems, setCartItems } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [showBottomActions, setShowBottomActions] = useState(false);

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

  const handleCheckout = () => {
    console.log("Checkout clicked, cart items:", cartItems);
    if (cartItems.length === 0) {
      toast("Your cart is empty. Add some items to proceed with checkout.",{
                position: "top-center",
        style: {
        background: "#fff",     
        color: "#001f3f",       
        fontWeight: "500",
        fontSize: "14px",
        border: "1px solid #001f3f",
        borderRadius: "8px",
    }
      });
      return;
    }
    navigate("/checkout");
  };

  // Debug: Log cart items whenever they change
  useEffect(() => {
    console.log("ProductList - Cart items updated:", cartItems);
  }, [cartItems]);

  useEffect(() => {

    
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (gender) params.set("gender", gender);
        if (category) params.set("category", category);
        if (limit) params.set("limit", String(limit));
        if (newArrival) params.set("newArrival", "true");
        if (bestSeller) params.set("bestSeller", "true");
        if (searchQuery) params.set("q", searchQuery);

        // Use search endpoint if there's a search query, otherwise use products endpoint
        const endpoint = searchQuery ? "/api/products/search" : "/api/products";
        const url = `${BACKEND_HOST}${endpoint}${params.toString() ? `?${params}` : ""}`;
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

        // Debug log
        try {
          console.log("ProductList - raw first item:", JSON.parse(JSON.stringify(rawItems[0])));
        } catch (e) {
          console.log("ProductList - can't stringify first item", e);
        }

        const normalized = rawItems.map(normalizeProduct).filter(Boolean);
        if (mounted) setItems(normalized);
      } catch (err) {
        console.error("ProductList fetch error:", err);
        if (mounted) setError("Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [gender, limit, category, searchQuery]);

  if (loading)
    return (
      <div className="py-8 flex items-center justify-center">
        <FaSpinner className="animate-spin text-3xl text-[#001f3f]" />
      </div>
    );

  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;
  if (!items.length) {
    return (
      <div className="py-8 text-center text-gray-600">
        {searchQuery ? (
          <div>
            <h2 className="text-xl font-semibold mb-2">No products found</h2>
            <p>No products found for "{searchQuery}". Try a different search term.</p>
          </div>
        ) : (
          "No products to show"
        )}
      </div>
    );
  }

  return (
    <section  className="product-section py-6 w-full">
      {searchQuery && (
        <div className="mb-6 px-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Search results for "{searchQuery}"
          </h2>
          <p className="text-gray-600 mt-1">
            {items.length} product{items.length !== 1 ? 's' : ''} found
          </p>
        </div>
      )}
      
      <div id="searchResult" className="grid gap-6 grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-[97%] ">
        {items.map((p) => (
          <Link
            key={p.id ?? p.product_id}
            to={`/product/${encodeURIComponent(p.product_id ?? p.id ?? "")}`}
            className="block group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow no-underline hover:no-underline"
          >
            <div id="productImage-List" className="w-full h-40 aspect-[3/4] bg-gray-100 overflow-hidden flex items-center justify-center ml-[10%]">
              {p.main_image ? (
                <img
                  src={p.main_image}
                  alt={p.name}
                  id="searchedImage"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="text-gray-400">📦</div>
              )}
            </div>

            <div className="p-3">
              <div className="text-sm font-semibold text-[#001f3f] text-center whitespace-normal break-words no-underline">{p.name}</div>
              <div className="prizeTag mt-1 flex items-baseline gap-[2%] justify-center">
              <div id="sellPrice_List" className="text-base font-bold text-[#001f3f]" style={{fontSize:"1.5rem"}} >
                
                  {p.displayPrice != null
                    ? `₹${Number(p.displayPrice).toLocaleString()}`
                    : "Price N/A"}
                </div>
                {p.displayMrp != null && (
                  <div className="text-xs text-gray-500 line-through  text-[#001f3f] hover:text-[#001f3f] visited:text-[#001f3f]">
                    ₹{Number(p.displayMrp).toLocaleString()}
                  </div>
                )}
    
                 {p.displayMrp && p.displayMrp > p.displayPrice &&(
                      <div className="ml-[1%] text-red-600 font-semibold text-[#016B00] visited:text-[#001f3f]">
                        ({Math.round(((p.displayMrp - p.displayPrice) / p.displayMrp) * 100)}% OFF)
                      </div> )}
              </div>

              <div className="mt-2 text-xs text-[#001f3f] text-center visited:text-[#001f3f] ">
                {p.sizesAvailable && p.sizesAvailable.length
                  ? `${p.sizesAvailable.length} size${p.sizesAvailable.length > 1 ? "s" : ""} available`
                  : "Single size"}
                  
              </div>
{/* actions */}
<div className="view-detail flex items-center justify-center space-y-4 mb-[10%] mt-[5%] ">
  {/* View Details button */}
  <PrimaryButton
    onClick={() => setShowBottomActions(true)}
    className="w-[50%]  py-3"
  >
    View Details
  </PrimaryButton>
</div>

{/* Bottom action bar */}
<div className={`bottom-actions ${showBottomActions ? "visible" : ""}`}>
  <div className="inner">
    <PrimaryButton
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart({
          id: product.product_id ?? extractMongoIdString(product._id),
          name: product.product_name,
          price: displayPrice,
          image: product.images?.[0] ?? "",
          size: selectedVariant?.size ?? null,
        });
      }}
      className="flex-1 py-3"
    >
      Add to Cart
    </PrimaryButton>

 

    {/* Close button */}
    <button
      onClick={() => setShowBottomActions(false)}
      className="ml-3 px-3 py-2 rounded-md text-sm text-slate-600 hover:text-slate-900"
      aria-label="Close"
    >
      ✕
    </button>
  </div>
</div>

                  
                </div>
          </Link>
        ))}

        
      </div>   

      {/* Debug: Show cart state 
      <div className="mt-4 px-4 text-center">
        <p className="text-sm text-gray-500">
          Debug: Cart has {cartItems.length} items
          {cartItems.length > 0 && (
            <span className="ml-2 text-green-600">
              (Total: ₹{cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()})
            </span>
          )}
        </p>
      </div>*/}

      {/* Checkout Button - Only show if cart has items 
      {cartItems.length > 0 && (
        <div className="mt-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-[#001f3f]">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-[#001f3f] mb-2">
                  🛒 Ready to Checkout?
                </h3>
                <p className="text-gray-600 mb-2">
                  {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart
                </p>
                <p className="text-lg font-bold text-[#001f3f]">
                  Total: ₹{cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()}
                </p>
              </div>
              <div className="flex justify-center">
                <PrimaryButton
                  onClick={handleCheckout}
                  className="inline-flex items-center justify-center gap-3 py-4 px-8 text-lg font-semibold min-w-[200px]"
                >
                  <MdShoppingBag className="text-2xl" />
                  Checkout
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}*/}
    </section>
  );
}
