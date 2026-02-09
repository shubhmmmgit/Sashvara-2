// server/routes/productRoutes.js
import express from "express";
import mongoose from "mongoose";
import {
  uploadMultiple,
  handleUploadError,
  getFileUrls,
} from "../middleware/multer.js";
import Product from "../models/product.js";
import Order from "../models/order.js";

const router = express.Router();

/**
 * Helper: try to find product by id-ish input.
 * Accepts Mongo ObjectId, product_id, or slug.
 */
async function findProductByIdentifier(identifier) {
  if (!identifier) return null;

  // Try ObjectId
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Product.findById(identifier).exec();
    if (byId) return byId;
  }

  // Try SKU / product_id
  const byPid = await Product.findOne({ product_id: identifier }).exec();
  if (byPid) return byPid;

  // Try slug
  const bySlug = await Product.findOne({ slug: identifier }).exec();
  if (bySlug) return bySlug;

  return null;
}

/* ---------------------- LIST /api/products ---------------------- */
/* ---------------------- LIST /api/products ---------------------- */
router.get("/", async (req, res) => {
  try {
    // parse & sanitize inputs
    const {
      q,
      category,
      gender,
      product_id,
      limit: limitRaw,
      sort = "createdAt",
      order = "desc",
      newArrival,
      bestSeller,
      collection,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(limitRaw || "100", 10), 1), 1000);

    const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const query = {};

    // 1) exact filters if provided
    if (category && category !== "all") {
      query.category = new RegExp(`^${esc(category)}$`, "i");
    }

    if (gender) {
      query.gender = new RegExp(`^${esc(gender)}$`, "i");
    }

    if (product_id) {
      query.product_id = new RegExp(`^${esc(product_id)}$`, "i");
    }

    if (typeof newArrival !== "undefined") {
      query.newArrival = String(newArrival).toLowerCase() === "true";
    }

    if (typeof bestSeller !== "undefined") {
      query.bestSeller = String(bestSeller).toLowerCase() === "true";
    }

    if (collection && collection !== "all") {
      query.collection = new RegExp(`^${esc(collection)}$`, "i");
    }

    // 2) free-text search across common fields (only if q provided)
    if (q && q.trim()) {
      const term = q.trim();
      const searchRegex = { $regex: term, $options: "i" };
      // If query already has $or, merge with existing filters; else set $or
      query.$or = [
        { product_name: searchRegex },
        { category: searchRegex },
        { product_id: searchRegex },
        { colour: searchRegex },
        { collection: searchRegex },
        { "variants.size": searchRegex },
      ];
    }

    // Sorting
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Execute query
    let qexec = Product.find(query).sort(sortObj);
    qexec = qexec.limit(limit);

    const docs = await qexec.lean().exec();

    return res.json({ success: true, data: docs, total: docs.length, filters: { category, gender, product_id, limit, sort, order, q, newArrival, bestSeller, collection } });
  } catch (err) {
    console.error("LIST /api/products error:", err);
    return res.status(500).json({ success: false, message: "server" });
  }
});

/* ---------------------- TOP PRODUCTS (best-effort) ---------------------- */
router.get("/top", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || "5", 10), 50));

    // If your Order schema uses cartItems (as you posted), aggregate on that.
    // This is a best-effort aggregation that returns item-key stats and attempts to
    // lookup a matching product document by product_name or product_id.
    const agg = [
      { $unwind: "$cartItems" },
      {
        $group: {
          _id: "$cartItems.name",
          orderCount: { $sum: { $ifNull: ["$cartItems.qty", 1] } },
          revenue: { $sum: { $multiply: [{ $ifNull: ["$cartItems.qty", 1] }, { $ifNull: ["$cartItems.price", 0] }] } },
          samplePrice: { $first: "$cartItems.price" },
          sampleImage: { $first: "$cartItems.image" }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          let: { pid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$product_name", "$$pid"] },
                    { $eq: ["$product_id", "$$pid"] }
                  ]
                }
              }
            },
            { $project: { _id: 1, product_id: 1, product_name: 1, images: 1, price: 1 } }
          ],
          as: "productMatch"
        }
      },
      { $unwind: { path: "$productMatch", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          key: "$_id",
          name: "$_id",
          orderCount: 1,
          revenue: 1,
          samplePrice: 1,
          sampleImage: 1,
          product: "$productMatch"
        }
      }
    ];

    const results = await Order.aggregate(agg).allowDiskUse(true);
    return res.json({ success: true, products: results });
  } catch (err) {
    console.error("TOP /api/products error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------- SEARCH ---------------------- */
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 10, gender, category } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 200);

    if (!q || !q.trim()) return res.json({ success: true, data: [], total: 0 });

    const searchTerm = q.trim();
    const query = {
      $or: [
        { product_name: { $regex: searchTerm, $options: "i" } },
        { category: { $regex: searchTerm, $options: "i" } },
        { product_id: { $regex: searchTerm, $options: "i" } },
        { colour: { $regex: searchTerm, $options: "i" } },
        { collection: { $regex: searchTerm, $options: "i" } },
        { "variants.size": { $regex: searchTerm, $options: "i" } }
      ]
    };

    if (gender) query.gender = new RegExp(`^${gender}$`, "i");
    if (category && category !== "all") query.category = new RegExp(`^${category}$`, "i");

    const products = await Product.find(query).limit(limitNum).sort({ createdAt: -1 }).exec();
    return res.json({ success: true, data: products, total: products.length, query: searchTerm });
  } catch (err) {
    console.error("Search products error:", err);
    return res.status(500).json({ success: false, message: "Search failed", error: err.message });
  }
});

/* ---------------------- COLLECTION SHORTCUTS ---------------------- */
router.get("/collections/new-arrivals", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
    const products = await Product.find({ newArrival: true }).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: products });
  } catch (err) {
    console.error("New arrivals error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch new arrivals", error: err.message });
  }
});

router.get("/collections/best-sellers", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
    const products = await Product.find({ bestSeller: true }).sort({ soldCount: -1 }).limit(limit).lean();
    return res.json({ success: true, data: products });
  } catch (err) {
    console.error("Best sellers error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch best sellers", error: err.message });
  }
});

/* ---------------------- GET BY SLUG ---------------------- */
router.get("/slug/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const product = await Product.findOne({ slug }).lean().exec();
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, data: product });
  } catch (err) {
    console.error("Get by slug error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch product", error: err.message });
  }
});

/* ---------------------- GET VARIANT (by variant _id) ---------------------- */
router.get("/variant/:variantId", async (req, res) => {
  try {
    const variantId = req.params.variantId;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ success: false, message: "Invalid variant id" });
    }

    const product = await Product.findOne({ "variants._id": variantId }, { "variants.$": 1, product_name: 1, product_id: 1, images: 1 }).exec();
    if (!product) return res.status(404).json({ success: false, message: "Variant not found" });

    const variant = product.variants && product.variants[0] ? product.variants[0] : null;
    return res.json({ success: true, data: { product, variant } });
  } catch (err) {
    console.error("Get variant error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch variant", error: err.message });
  }
});

/* ---------------------- GET SINGLE PRODUCT (flexible identifier) ---------------------- */
router.get("/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, data: product });
  } catch (err) {
    console.error("Get product error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch product", error: err.message });
  }
});

/* ---------------------- CREATE (with optional images) ---------------------- */
router.post("/", uploadMultiple, handleUploadError, async (req, res) => {
  try {
    const payload = req.body ?? {};

    // merge uploaded images
    if (req.files && req.files.length) {
      payload.images = getFileUrls(req.files);
    } else if (payload.images && typeof payload.images === "string") {
      try {
        payload.images = JSON.parse(payload.images);
      } catch {
        payload.images = [payload.images];
      }
    }
       if (Array.isArray(payload.images)) {
      payload.images = payload.images.map(
        (url) => url.replace("/upload/", "/upload/q_auto,f_auto/")
      );
    }

    // normalize variants
    if (payload.variants && typeof payload.variants === "string") {
      try {
        payload.variants = JSON.parse(payload.variants);
      } catch {}
    }

    const product = await Product.create(payload);
    return res.status(201).json({ success: true, message: "Product created", data: product });
  } catch (err) {
    console.error("Create product error:", err);
    return res.status(500).json({ success: false, message: "Create failed", error: err.message });
  }
});

/* ---------------------- UPDATE PRODUCT ---------------------- */
router.put("/:identifier", uploadMultiple, handleUploadError, async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    // === Normalization: place this RIGHT after `const payload = req.body ?? {};` ===
    const payload = req.body ?? {};

    try {
      // Accept frontend variants shaped as { name, price } or { size, mrp, sell_price }
      if (Array.isArray(payload.variants)) {
        payload.variants = payload.variants.map(v => ({
          // preserve _id if present
          ...(v && v._id ? { _id: v._id } : {}),
          size: (v && (v.size ?? v.name) ? String(v.size ?? v.name).trim() : ""),
          // ensure numeric fields are numbers (fallback to 0)
          mrp: Number(v && (v.mrp ?? v.mrp ?? (v.price ?? 0))) || 0,
          sell_price: Number(v && (v.sell_price ?? v.price ?? 0)) || 0,
          stock: Number(v && (v.stock ?? 0)) || 0,
          attributes: v && (v.attributes ?? v.attrs) ? (v.attributes ?? v.attrs) : {},
        }));
      }

      // Accept top-level name → product_name
      if (payload.name && !payload.product_name) payload.product_name = payload.name;
    } catch (normErr) {
      console.warn("Normalization error:", normErr);
      // continue — normalization failure shouldn't crash the handler
    }

    // --- continue with the rest of the existing handler logic ---
    // handle uploaded files (if any) and replace/concat images
    if (req.files && req.files.length) {
      const uploaded = getFileUrls(req.files);
      if (payload.replaceImages === "true" || payload.replaceImages === true) {
        product.images = uploaded;
      } else {
        product.images = Array.isArray(product.images) ? product.images.concat(uploaded) : uploaded;
      }
    }

    const updatable = [
      "product_name", "category", "colour", "gender", "slug",
      "product_id", "metadata", "newArrival", "bestSeller", "stock", "price"
    ];
    updatable.forEach((k) => {
      if (typeof payload[k] !== "undefined") product[k] = payload[k];
    });

    if (payload.variants) {
      try {
        product.variants = typeof payload.variants === "string" ? JSON.parse(payload.variants) : payload.variants;
      } catch {}
    }

    await product.save();
    return res.json({ success: true, message: "Product updated", data: product });
  } catch (err) {
    console.error("Update product error:", err?.message, err?.stack);
    return res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
});

/* ---------------------- DELETE PRODUCT ---------------------- */
router.delete("/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    await Product.findByIdAndDelete(product._id).exec();
    return res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    return res.status(500).json({ success: false, message: "Delete failed", error: err.message });
  }
});


export default router;
