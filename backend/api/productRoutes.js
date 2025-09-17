// server/routes/productRoutes.js
import express from "express";
import mongoose from "mongoose";
import {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  getFileUrls,
} from "../middleware/multer.js";
import Product from "../models/product.js";

const router = express.Router();

/**
 * Helper: try to find product by id-ish input.
 * Accepts:
 *  - Mongo _id (ObjectId)
 *  - product_id (your SKU-like code)
 *  - slug (SEO slug)
 */
async function findProductByIdentifier(identifier) {
  if (!identifier) return null;

  // 1) Try Mongo _id if valid ObjectId
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Product.findById(identifier).exec();
    if (byId) return byId;
  }

  // 2) Try product_id exact match
  const byPid = await Product.findOne({ product_id: identifier }).exec();
  if (byPid) return byPid;

  // 3) Try slug
  const bySlug = await Product.findOne({ slug: identifier }).exec();
  if (bySlug) return bySlug;

  // nothing found
  return null;
}

/* ---------------------- CREATE (with optional images) ---------------------- */
router.post("/", uploadMultiple, handleUploadError, async (req, res) => {
  try {
    const payload = req.body ?? {};

    // If images were uploaded via multer, merge them
    if (req.files && req.files.length) {
  const rawUrls = getFileUrls(req.files);
  payload.images = rawUrls.map(url =>
    url.replace("/upload/", "/upload/f_auto,q_auto,w_800/")
  );
    } else if (payload.images && typeof payload.images === "string") {
      // JSON strings sometimes get passed in form-data; try to parse
      try {
        payload.images = JSON.parse(payload.images);
      } catch {
        // leave as-is (string) — model will sanitize
        payload.images = [payload.images];
      }
    }

    // Ensure variants is array (if client sent as JSON string)
    if (payload.variants && typeof payload.variants === "string") {
      try {
        payload.variants = JSON.parse(payload.variants);
      } catch {
        // leave it, mongoose validation will catch issues
      }
    }

    // Basic required checks
    const required = ["product_id", "product_name", "category", "gender", "variants"];
    for (const key of required) {
      if (!payload[key]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${key}`,
        });
      }
    }

    const product = await Product.create(payload);

    return res.status(201).json({
      success: true,
      message: "Product created",
      data: product,
    });
  } catch (err) {
    console.error("Create product error:", err);
    if (err.code === 11000) {
      const dupKey = Object.keys(err.keyValue || {})[0];
      return res.status(409).json({
        success: false,
        message: `Duplicate key: ${dupKey}`,
        error: err.message,
      });
    }
    return res.status(500).json({ success: false, message: "Create failed", error: err.message });
  }
});

/* ---------------------- SEARCH PRODUCTS (dedicated search endpoint) ---------------------- */
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 10, gender, category } = req.query;
    
    if (!q || !q.trim()) {
      return res.json({ success: true, data: [], total: 0 });
    }

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

    // Add gender filter if provided
    if (gender) {
      query.gender = new RegExp(`^${gender}$`, "i");
    }

    // Add category filter if provided
    if (category && category !== "all") {
      query.category = new RegExp(`^${category}$`, "i");
    }

    const limitNum = parseInt(limit, 10) || 10;
    const products = await Product.find(query)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .exec();

    return res.json({
      success: true,
      data: products,
      total: products.length,
      query: searchTerm
    });
  } catch (err) {
    console.error("Search products error:", err);
    return res.status(500).json({
      success: false,
      message: "Search failed",
      error: err.message
    });
  }
});

/* ---------------------- GET PRODUCTS (with filters) ---------------------- */
router.get("/", async (req, res) => {
  try {
    const {
      category,
      gender,
      product_id,
      limit,
      sort = "createdAt",
      order = "desc",
      q,
      newArrival,
      bestSeller,
      collection,
    } = req.query;

    const query = {};
    const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Category filter (ignore "all")
    if (category && category !== "all") {
      query.category = new RegExp(`^${esc(category)}$`, "i");
    }

    // Gender filter (men/women etc.)
    if (gender) {
      query.gender = new RegExp(`^${esc(gender)}$`, "i");
    }

    // Product ID filter (exact-ish)
    if (product_id) {
      query.product_id = new RegExp(`^${esc(product_id)}$`, "i");
    }

    // Enhanced text search
    if (q) {
      const searchTerm = q.trim();
      if (searchTerm) {
        // Use regex for more flexible search across multiple fields
        query.$or = [
          { product_name: { $regex: searchTerm, $options: "i" } },
          { category: { $regex: searchTerm, $options: "i" } },
          { product_id: { $regex: searchTerm, $options: "i" } },
          { colour: { $regex: searchTerm, $options: "i" } },
          { gender: { $regex: searchTerm, $options: "i" } },
          { collection: { $regex: searchTerm, $options: "i" } },
          // Search in variants for size
          { "variants.size": { $regex: searchTerm, $options: "i" } }
        ];
      }
    }

    // New Arrival filter (accepts ?newArrival=true or ?newArrival=false)
    if (typeof newArrival !== "undefined") {
      query.newArrival = String(newArrival).toLowerCase() === "true";
    }

    // Best Seller filter
    if (typeof bestSeller !== "undefined") {
      query.bestSeller = String(bestSeller).toLowerCase() === "true";
    }

    // Collection filter
    if (collection) {
      query.collection = new RegExp(`^${collection}$`, "i");
    }

    // Sorting
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Query execution
    let productsQuery = Product.find(query).sort(sortObj);
    if (limit) {
      const n = parseInt(limit, 10);
      if (!Number.isNaN(n) && n > 0) productsQuery = productsQuery.limit(n);
    }

    const products = await productsQuery.exec();

    return res.json({
      success: true,
      data: products,
      total: products.length,
      filters: { category, gender, product_id, limit, sort, order, q, newArrival, bestSeller, collection },
    });
  } catch (err) {
    console.error("Fetch products error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: err.message,
    });
  }
});

/* ---------------------- COLLECTION SHORTCUTS (optional) ---------------------- */
router.get("/collections/new-arrivals", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit ?? "20", 10) || 20;
    const products = await Product.find({ newArrival: true }).sort({ createdAt: -1 }).limit(limit).exec();
    return res.json({ success: true, data: products });
  } catch (err) {
    console.error("New arrivals error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch new arrivals", error: err.message });
  }
});

router.get("/collections/best-sellers", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit ?? "20", 10) || 20;
    const products = await Product.find({ bestSeller: true }).sort({ soldCount: -1 }).limit(limit).exec();
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
    const product = await Product.findOne({ slug }).exec();
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

    // Find product that contains this variant and project the matched variant
    const product = await Product.findOne(
      { "variants._id": variantId },
      { "variants.$": 1, product_name: 1, product_id: 1, images: 1 }
    ).exec();

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

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, data: product });
  } catch (err) {
    console.error("Get product error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch product", error: err.message });
  }
});

/* ---------------------- UPDATE PRODUCT ---------------------- */
router.put("/:identifier", uploadMultiple, handleUploadError, async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const payload = req.body ?? {};

    // Merge uploaded images (if any)
   if (req.files && req.files.length) {
  const rawUrls = getFileUrls(req.files);
  const optimizedUrls = rawUrls.map(url =>
    url.replace("/upload/", "/upload/f_auto,q_auto,w_800/")
  );

  if (payload.replaceImages === "true" || payload.replaceImages === true) {
    product.images = optimizedUrls;
  } else {
    product.images = Array.isArray(product.images)
      ? product.images.concat(optimizedUrls)
      : optimizedUrls;
  }
}

    // Allow updating top-level fields
    const updatable = [
      "product_name",
      "category",
      "colour",
      "gender",
      "slug",
      "product_id",
      "metadata",
      "newArrival",
      "bestSeller",
    ];
    updatable.forEach((k) => {
      if (typeof payload[k] !== "undefined") product[k] = payload[k];
    });

    // Allow replacing variants (client may send variants as JSON string)
    if (payload.variants) {
      try {
        product.variants = typeof payload.variants === "string" ? JSON.parse(payload.variants) : payload.variants;
      } catch (e) {
        // ignore parse errors; will fail on save validation
      }
    }

    await product.save();

    return res.json({ success: true, message: "Product updated", data: product });
  } catch (err) {
    console.error("Update product error:", err);
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
