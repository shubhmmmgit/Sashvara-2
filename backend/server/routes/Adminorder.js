// Adminorder.js
import express from "express";
import Order from "../models/order.js";         // use existing Order model
import Product from "../models/product.js";     // to adjust stock on completion
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

// GET list
router.get("/", isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const q = status ? { status } : {};
    const orders = await Order.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, orders });
  } catch (err) {
    console.error("AdminOrder GET list error:", err);
    res.status(500).json({ error: "server" });
  }
});

// GET one
router.get("/:id([0-9a-fA-F]{24})", isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({});
    res.json({ success: true, order });
  } catch (err) {
    console.error("AdminOrder GET one error:", err);
    res.status(500).json({ error: "server" });
  }
});

// Change status and adjust stock when moving to 'completed'
router.put("/:id/status", isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({});
    const prev = order.status;
    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    if (prev !== "completed" && status === "completed") {
      for (const it of order.items) {
        if (it.variantId) {
          // reduce variant stock (assumes variant array structure in Product model)
          await Product.updateOne({ "variants._id": it.variantId }, { $inc: { "variants.$.stock": -it.qty } });
        } else {
          await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -it.qty } });
        }
      }
    }

    req.app.get("io")?.emit("orderStatusChanged", { orderId: order._id, status });
    res.json({ success: true, order });
  } catch (err) {
    console.error("AdminOrder update status error:", err);
    res.status(500).json({ error: "server" });
  }
});

export default router;
