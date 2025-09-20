// src/pages/Collection.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PrimaryButton from "./PrimaryButton";
import { useCart } from "../context/CartContext";
import { MdOutlineShoppingCart } from "react-icons/md";
import { imageUrl } from '../utils/imageUrl';

const BACKEND_HOST = import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com";

/** Ensure absolute, clean image URL 
const normalizeImageUrl = (img) => {
  if (!img) return "";
  const raw = String(img).trim().replace(/\\/g, "/"); // handle backslashes
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `${BACKEND_HOST}${raw}`;
  return `${BACKEND_HOST}/images/${raw}`;
};*/

/** Gather images from images[] or flattened images/0, images/1, ... */
const collectImages = (p) => {
  if (!p || typeof p !== "object") return [];
  // If array exists, support strings or objects like { url }
  if (Array.isArray(p.images) && p.images.length) {
    return p.images
      .map((it) => (typeof it === "string" ? it : it?.url || it?.src || ""))
      .filter(Boolean);
  }
  // Flattened keys
  const keys = Object.keys(p).filter((k) => /^images\/\d+$/.test(k));
  keys.sort((a, b) => Number(a.split("/")[1]) - Number(b.split("/")[1]));
  return keys.map((k) => p[k]).filter(Boolean);
};

/** Collect flattened variants or array-shaped variants */
const collectVariants = (obj) => {
  if (!obj) return [];
  if (Array.isArray(obj.variants) && obj.variants.length) return obj.variants;

  const rows = {};
  for (const k of Object.keys(obj)) {
    // matches keys like "variants/0/size", "variants/1/sell_price"
    const m = k.match(/^variants\/(\d+)\/(.+)$/);
    if (m) {
      const idx = Number(m[1]);
      const field = m[2];
      rows[idx] = rows[idx] || {};
      rows[idx][field] = obj[k];
    }
  }

  return Object.values(rows).map((r) => ({
    // adapt common fields; keep raw values where available
    size: r.size ?? r.variant_size ?? r.title ?? null,
    mrp: r.mrp != null ? Number(r.mrp) : r.list_price ? Number(r.list_price) : undefined,
    sell_price: r.sell_price != null ? Number(r.sell_price) : r.price ? Number(r.price) : undefined,
    // keep entire variant object for advanced lookups
    ...r,
  }));
};

const cheapestVariant = (variants = []) => {
  if (!variants.length) return null;
  return variants.reduce((a, b) =>
    Number(b.sell_price ?? Infinity) < Number(a.sell_price ?? Infinity) ? b : a
  );
};

// ---- price utils ----
const toNumberSafe = (val) => {
  if (val == null) return null;
  if (typeof val === "object") {
    // try to extract common numeric fields from objects like { amount: "499", value: "499" }
    const candidate = val.amount ?? val.value ?? val.price ?? val.sell_price ?? val.mrp;
    if (candidate == null) return null;
    return toNumberSafe(candidate);
  }
  const s = String(val).trim();
  if (!s) return null;
  // strip currency, commas, spaces
  const n = Number(s.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n;
};

const getPath = (obj, pathArr) =>
  pathArr.reduce((acc, k) => (acc == null ? acc : acc[k]), obj);

// Try a bunch of common paths on either a product or a variant object
const bestPriceFromFlat = (obj) => {
  if (!obj || typeof obj !== "object") return null;
  const paths = [
    ["sell_price"], ["sellPrice"], ["selling_price"], ["sellingPrice"],
    ["sale_price"], ["salePrice"],
    ["price"], ["price_value"], ["priceValue"], ["final_price"], ["finalPrice"],
    ["discounted_price"], ["discountedPrice"],
    ["base_price"], ["basePrice"],
    ["amount"], ["value"], ["priceObj","amount"],
    ["pricing","price"], ["pricing","final"], ["pricing","amount"],
    ["prices",0,"amount"], ["prices",0,"value"],
    ["price", "amount"], ["price", "value"],
    ["displayPrice"], ["display_price"],
    ["mrp"], ["list_price"], ["listPrice"], ["compare_at_price"], ["compareAtPrice"],
    ["sample","price"], ["sample","sell_price"], ["sample","selling_price"],
  ];
  for (const p of paths) {
    const v = toNumberSafe(getPath(obj, p));
    if (v != null) return v;
  }
  return null;
};

// Choose min price across variants (if any), else from product-level fields
const resolvePrice = (product) => {
  let cand = bestPriceFromFlat(product);

  if (Array.isArray(product?.variants) && product.variants.length) {
    // prefer a selected variant price if product exposes selection
    const selKeys = ["selectedVariantId","selected_variant_id","variantId","variant_id","selected_variant"];
    for (const key of selKeys) {
      const id = product[key];
      if (id != null) {
        const sv = product.variants.find(v => String(v.id) === String(id) || String(v._id) === String(id));
        if (sv) {
          const svPrice = bestPriceFromFlat(sv) ?? toNumberSafe(getPath(sv, ["prices",0,"amount"]));
          if (svPrice != null) return svPrice;
        }
      }
    }

    // fallback: find min priced variant
    for (const v of product.variants) {
      const pv = bestPriceFromFlat(v);
      if (pv != null) cand = cand == null ? pv : Math.min(cand, pv);
      const pv2 = toNumberSafe(getPath(v, ["prices", 0, "amount"]));
      if (pv2 != null) cand = cand == null ? pv2 : Math.min(cand, pv2);
    }
  }

  if (cand == null) {
    const cvSell = toNumberSafe(getPath(product, ["cheapestVariant", "sell_price"]));
    const cvMrp = toNumberSafe(getPath(product, ["cheapestVariant", "mrp"]));
    if (cvSell != null) cand = cvSell; else if (cvMrp != null) cand = cvMrp;
  }

  // Additional fallbacks for other common shapes
  if (cand == null) {
    const fallbacks = [
      ["prices", 0, "amount"],
      ["default_variant", "price"],
      ["defaultVariant", "price"],
      ["options", 0, "price"],
      ["displayPrice"],
      ["priceRange","minVariantPrice","amount"]
    ];
    for (const p of fallbacks) {
      const v = toNumberSafe(getPath(product, p));
      if (v != null) { cand = v; break; }
    }
  }

  return cand;
};

const resolveMrp = (product, price) => {
  const candidates = [
    ["mrp"], ["MRP"], ["list_price"], ["listPrice"], ["compare_at_price"], ["compareAtPrice"],
    ["pricing","mrp"], ["pricing","list"],
    ["variants",0,"mrp"], ["variants",0,"list_price"],
    ["prices",0,"mrp"], ["prices",0,"list"],
    ["sample","mrp"], ["sample","mrp_price"]
  ];
  let mrp = null;
  for (const p of candidates) {
    const v = toNumberSafe(getPath(product, p));
    if (v != null) { mrp = v; break; }
  }
  // Show MRP when price is missing, or when it's greater than price
  if (mrp != null && (price == null || mrp > price)) return mrp;
  return null;
};

const normalizeProduct = (p, idx = 0) => {
  if (!p) return null;

  const imgs = collectImages(p).map(imageUrl);
  const variants = collectVariants(p);
  const cheapest = cheapestVariant(variants);

  const sell_price = cheapest?.sell_price ?? p.sell_price ?? null;
  const mrp = cheapest?.mrp ?? p.mrp ?? null;

  // Resolve using robust resolver too
  const resolved = resolvePrice(p);
  const priceResolved = resolved ?? sell_price ?? null;
  const mrpResolved = resolveMrp(p, priceResolved);

  const finalPrice = priceResolved ?? mrpResolved ?? null;
  const finalMrp = mrpResolved != null && finalPrice != null && mrpResolved > finalPrice ? mrpResolved : null;

  if (finalPrice == null && idx < 3) {
    // eslint-disable-next-line no-console
    console.warn("No price resolved for product:", {
      id: p.product_id || p._id || p.id,
      name: p.product_name || p.name || p.title,
      sample: {
        price: p.price, sell_price: p.sell_price, selling_price: p.selling_price,
        prices: p.prices, pricing: p.pricing,
        variants: Array.isArray(p.variants) ? p.variants.slice(0, 1) : p.variants,
        sample: p.sample,
      }
    });
  }

  const pid = p.product_id ?? p._id ?? p.id ?? null;

  return {
    raw: p,
    id: pid,
    product_id: pid,
    name: p.product_name ?? p.name ?? p.title ?? pid ?? "Unnamed product",
    img: imgs[0] ? imageUrl(imgs[0]) : "",
    main_image: imgs[0] ? imageUrl(imgs[0]) : "",
    images: imgs.map(imageUrl),
    variants,
    sizesAvailable: variants.map(v => v.size).filter(Boolean),
    displayPrice: finalPrice != null ? Number(finalPrice) : null,
    displayMrp: finalMrp != null ? Number(finalMrp) : null,
  };
};

export default function Collection() {
  const { collection } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setCartItems } = useCart();

  const addToCart = (p) => {
    const id = p.id ?? p.product_id;
    const name = p.name;
    const price = Number((p && (p.displayPrice ?? p.price ?? p.mrp)) ?? 0);
    const image = p.main_image || p.img || "";
    if (!id) return;
    setCartItems((prev) => {
      const existing = prev.find((it) => it.id === id);
      if (existing) {
        return prev.map((it) => (it.id === id ? { ...it, qty: (it.qty || 0) + 1 } : it));
      }
      return [...prev, { id, name, price, image, qty: 1 }];
    });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const url = `${BACKEND_HOST}/api/products?collection=${encodeURIComponent(collection)}&limit=60`;
        const res = await fetch(url);
        const json = await res.json();
        const data = Array.isArray(json) ? json : json?.data ?? [];

        const normalized = data.map((p, idx) => normalizeProduct(p, idx)).filter(Boolean);

        if (mounted) setItems(normalized);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch products:", e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [collection]);

  const titleMap = {
    aafat_ki_adda: "Aafat Ki Adda",
    patakha: "Patakha",
    desi_drama: "Desi Drama",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 id="collectionName" className="text-3xl font-bold text-[#001f3f] mb-6">{titleMap[collection] || collection}</h1>

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500">No products in this collection.</div>
      ) : (
        <div id="collectionWrap"  className="grid grid-cols-4  gap-[5%]">
          {items.map((p) => (
            <Link
              key={p.id}
              to={`/product/${encodeURIComponent(p.id ?? "")}`}
              className="block bg-white overflow-hidden hover:shadow-md transition-shadow no-underline text-current"
            >
              <div id="collectionImgwrap" className="aspect-[9/16] bg-gray-100">
                {p.img ? (
                  <img src={imageUrl(p.img)} alt={p.name} className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                )}
              </div>

              <div className="p-3">
                <div id="collectionName" className="text-sm font-semibold text-[#001f3f] text-center whitespace-normal break-words no-underline" style={{ fontSize: "1.11rem", fontWeight: 500 }}>{p.name}</div>

                <div className="mt-1 flex items-baseline gap-4 justify-center">
                  {p.displayMrp != null && <div className="text-xs text-gray-500 line-through">₹{Number(p.displayMrp).toLocaleString()}</div>}
                  <div className="text-base font-bold text-[#001f3f]">{p.displayPrice != null ? `₹${Number(p.displayPrice).toLocaleString()}` : "Price N/A"}</div>
                </div>

                <div className="mt-3 flex justify-center mb-[20%]  ">
                  <PrimaryButton id="addtocartButton"  onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(p); }} className="inline-flex items-center gap-2 rounded-full">
                    <MdOutlineShoppingCart className="text-base" />
                    Add to Cart
                  </PrimaryButton>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div id="moreCollection" className="grid grid-cols-3">
        <Link to="/collections/aafat_ki_adda" className="text-[#001f3f] underline"><img src="../images/aafat_ki_adaa.webp"  className="w-[80%]"/></Link>
         <Link to="/collections/desi_drama" className="text-[#001f3f] underline"><img src="../images/template_2.png"  className="w-[80%]"/></Link>
         <Link to="/collections/patakha" className="text-[#001f3f] underline" ><img src="../images/template_1_2.webp" className="w-[80%] "/></Link>
      </div>

      <div>
       
      </div>
    </div>
  );
}
