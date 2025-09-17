// src/components/HomeSlider.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { FaSpinner } from "react-icons/fa";
import { MdOutlineShoppingCart,MdShoppingBag } from "react-icons/md";
import { useCart } from "../context/CartContext";
import PrimaryButton from "./PrimaryButton";
import toast from "react-hot-toast";
import { imageUrl } from "../utils/imageUrl";
import { FaShoppingBag } from "react-icons/fa";



const BACKEND_HOST = import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com";

/* ---------- Utilities ---------- */

// Normalize key names (ignore spaces/underscores/case)
const normalizeKeyName = (k) => String(k ?? "").replace(/[\s_\-]+/g, "").toLowerCase();
const findKeyNormalized = (obj, target) => {
  if (!obj || typeof obj !== "object") return undefined;
  const want = normalizeKeyName(target);
  return Object.keys(obj).find((k) => normalizeKeyName(k) === want);
};
const pickVal = (obj, candidates = []) => {
  if (!obj || typeof obj !== "object") return { value: undefined, key: null };
  for (const cand of candidates) {
    if (Object.prototype.hasOwnProperty.call(obj, cand)) {
      return { value: obj[cand], key: cand };
    }
    const found = findKeyNormalized(obj, cand);
    if (found !== undefined) return { value: obj[found], key: found };
  }
  return { value: undefined, key: null };
};

// Extract id from different shapes
const extractId = (maybeId) => {
  if (maybeId === undefined || maybeId === null) return null;
  if (typeof maybeId === "string") return maybeId;
  if (typeof maybeId === "object") {
    if (maybeId.$oid) return maybeId.$oid;
    if (maybeId.toString && typeof maybeId.toString === "function") {
      try {
        const s = maybeId.toString();
        if (s && s !== "[object Object]") return s;
      } catch {}
    }
  }
  return String(maybeId);
};

/* Ensure absolute image URL
const normalizeImageUrl = (img) => {
  if (!img) return "";
  const s = String(img).trim();
  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return `${BACKEND_HOST}${s}`;
  return `${BACKEND_HOST}/images/${s}`;
};*/

/* ---------- FIX: collectVariants for flattened keys ---------- */
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

/* ---------- Normalize product ---------- */
const normalizeProduct = (p) => {
  if (!p || typeof p !== "object") return null;

  // id
  const idPick = pickVal(p, ["product_id"]);
  const id = extractId(idPick.value);

  // name
  const namePick = pickVal(p, ["product_name"]);
  let displayName = namePick.value ? String(namePick.value).trim() : "Unnamed product";

  // variants
  const variants = collectVariants(p);
  let cheapest = null;
  if (variants.length) {
    cheapest = variants.reduce((a, b) =>
      Number(b.sell_price ?? Infinity) < Number(a.sell_price ?? Infinity) ? b : a
    );
  }

  const displayPrice = cheapest?.sell_price ?? null;
  const displayMrp =
  cheapest?.mrp && cheapest?.mrp !== cheapest?.sell_price ? cheapest.mrp : null;

  

 

  // images
  const imgsPick = pickVal(p, ["images"]);
  const imgsRaw = imgsPick.value ?? [];
  const imgsArray = Array.isArray(imgsRaw) ? imgsRaw : imgsRaw ? [imgsRaw] : [];

  // handle flattened images/0, images/1
  if (!imgsArray.length) {
    const keys = Object.keys(p).filter((k) => /^images\/\d+$/.test(k));
    keys.sort((a, b) => Number(a.split("/")[1]) - Number(b.split("/")[1]));
    keys.forEach((k) => imgsArray.push(p[k]));
  } 

  const images = imgsArray.map(imageUrl);
  const main_image = images[0] || "";
  const second_image = images[1] || "";

  return {
    id,
    product_id: p.product_id,
    name: displayName,
    displayPrice,
    displayMrp,
    images,
    main_image,
    raw: p,
  };
};

/* ---------- Component ---------- */
export default function HomeSlider({ gender = null, collection = null, limit = 10, title = "WOMEN",  endpoint = "/api/products"  }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cartItems, setCartItems } = useCart();
  const navigate = useNavigate();
  const [showBottomActions, setShowBottomActions] = useState(false);


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
  
  const goToCheckout = () => {
   navigate("/checkout");
  };
  const handleCheckout = () => {
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

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (collection) params.set("collection", collection);
    if (limit) params.set("limit", String(limit));
    const base = `${BACKEND_HOST}${endpoint}`;
    const sep = base.includes("?") ? "&" : "?";
    const url = `${base}${params.toString() ? `${sep}${params}` : ""}`;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const rawItems = Array.isArray(json) ? json : json?.data ?? [];

        if (!rawItems.length) {
          if (mounted) setItems([]);
          return;
        }

        const normalized = rawItems.map(normalizeProduct).filter(Boolean);
        if (mounted) setItems(normalized);
      } catch (err) {
        console.error("HomeSlider fetch error:", err);
        if (mounted) setError("Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [gender, limit]);

  if (loading)
    return (
      <div className="py-8 flex items-center justify-center">
        <FaSpinner className="animate-spin text-3xl text-[#001f3f]" />
      </div>
    );

  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;
  if (!items.length)
    return <div className="py-8 text-center text-gray-600"></div>;

  return (
    <section className="product-section py-6 w-full"  >
      
      <div className="product-container w-full px-4 border-b-2 border-[#808080]  " >
        {title && (
          <h2 className="flex justify-center  text-2xl font-bold mb-[5%] text-[#001f3f]">{title}</h2>
        )}

        <Swiper
          navigation
          modules={[Navigation]}
          spaceBetween={8}
          slidesPerView={4}
          breakpoints={{
            // when window width is >= 320px
            320: { slidesPerView: 2, spaceBetween: 8 },
            // when window width is >= 640px
            640: { slidesPerView: 2, spaceBetween: 8 },
            // when window width is >= 768px
            768: { slidesPerView: 2, spaceBetween: 8 },
            // when window width is >= 1024px (desktop)
            1024: { slidesPerView: 4, spaceBetween: 8 },
          }}
           slidesOffsetBefore={0}
           slidesOffsetAfter={0}
          
           className="mySwiper  h-[] w-[97%]"
           
         >
          {items.map((p) => (
            <SwiperSlide key={p.id ?? p.product_id} >
              <Link to={`/product/${p.product_id ?? ""}`} className="block group no-underline hover:no-underline" >
                <div className="product-image flex-shrink-0 w-full aspect-[3/4] object-cover object-center bg-gray-100 rounded-lg overflow-hidden" >
                  {p.main_image ? (
                    <img
                      src={p.main_image}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"  style={{borderRadius:"16px"}}
                    />
                  ) : (
                    <div >
                      
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <div id="product-name" className="product-name font-medium text-[#001f3f] text-center whitespace-normal break-words"  style={{fontSize:"1.11rem", marginTop:"1rem", marginBottom:"1.2rem"}}>{p.name}</div>

                  <div className="mt-1 flex items-baseline gap-3 justify-center">
                    {p.displayMrp != null && (
                      <div className="text-xs text-[#001f3f] line-through " >
                        ₹{Number(p.displayMrp).toLocaleString()}
                      </div>
                    )}
                    <div className="text-xl text-[#001f3f]  " style={{fontSize:"1.50rem", marginBottom:"1rem"}}>
                      {p.displayPrice != null
                        ? `₹${Number(p.displayPrice).toLocaleString()}`
                        : "Price N/A"}
                        
                    </div>
                    {p.displayMrp != null && (
                      <div className="ml-[1%] text-red-600 font-semibold text-[#001f3f] visited:text-[#001f3f]" >
                        ({Math.round(((p.displayMrp - p.displayPrice) / p.displayMrp) * 100)}% OFF)
                      </div>
                    )}
                  </div>

{/* actions */}
<div className="view-detail flex items-center justify-center space-y-4 mb-[10%] ">
  {/* View Details button */}
  <PrimaryButton
    onClick={() => setShowBottomActions(true)}
    className="w-[70%]  py-3"
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

    <PrimaryButton
      type="button"
      onClick={goToCheckout}
      className="flex-1 py-3 bg-green-600 hover:bg-green-700"
    >
      Checkout
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
            </SwiperSlide>
          ))}
        </Swiper>
        
      </div>

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
