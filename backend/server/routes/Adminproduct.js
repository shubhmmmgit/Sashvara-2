// Adminproduct.js
import express from "express";
import Product from "../models/product.js";   // use existing Product model
import Order from "../models/order.js";       // only for aggregation in /top
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

// GET /admin/api/products
router.get("/", isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const q = search ? { name: { $regex: search, $options: "i" } } : {};
    const products = await Product.find(q)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Product.countDocuments(q);
    res.json({ success: true, products, total });
  } catch (err) {
    console.error("AdminProduct GET list error:", err);
    res.status(500).json({ error: "server" });
  }
});

// GET top ordered products (aggregates on Orders collection)
router.get("/top", isAdmin, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 5));
    const productCollection = Product.collection.collectionName || "products";

    const agg = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", orderCount: { $sum: "$items.qty" } } },
      { $sort: { orderCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: productCollection,
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: "$product._id",
          name: "$product.name",
          price: "$product.price",
          orderCount: 1,
        },
      },
    ]);

    res.json({ success: true, products: agg });
  } catch (err) {
    console.error("AdminProduct top aggregation error:", err);
    res.status(500).json({ error: "server" });
  }
});

// POST /admin/api/products  (create)
router.post("/", isAdmin, async (req, res) => {
  try {
    const p = new Product(req.body);
    await p.save();
    res.json({ success: true, product: p });
  } catch (err) {
    console.error("AdminProduct POST error:", err);
    res.status(500).json({ error: "server" });
  }
});

// PUT /admin/api/products/:id (update)
router.put("/:id", isAdmin, async (req, res) => {
  try {
    console.debug("[ADMIN PUT] id:", req.params.id, "bodyKeys:", Object.keys(req.body || {}));
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ success: false, error: "product not found" });
    res.json({ success: true, product: p });
  } catch (err) {
    console.error("AdminProduct PUT error:", err?.message, err?.stack);
    // include validation errors if mongoose exposes them
    return res.status(500).json({ error: "server", details: err.message });
  }
});
// DELETE /admin/api/products/:id
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("AdminProduct DELETE error:", err);
    res.status(500).json({ error: "server" });
  }
});

export default router;
