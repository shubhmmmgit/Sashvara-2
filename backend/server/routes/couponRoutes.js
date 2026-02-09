import express from "express";
import Coupon from "../models/Coupon.js";
import { validateAndCalculateCoupon } from "../lib/couponUtils.js";

const router = express.Router();

// GET /api/coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// POST /api/coupons
router.post("/", async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/coupons/:id
router.delete("/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});
router.post("/apply", async (req, res) => {
  try {
    const { code, subtotal, userId } = req.body;
    if (!code) return res.status(400).json({ success:false, message: "Code required" });

    const result = await validateAndCalculateCoupon(code, Number(subtotal || 0), userId || null);
    if (!result.valid) return res.status(400).json({ success:false, message: result.message });

    res.json({ success:true, discountAmount: result.discountAmount, newTotal: Math.max(0, subtotal - result.discountAmount), couponId: result.couponId, coupon: { code: result.coupon.code, type: result.coupon.type } });
  } catch (err) {
    console.error("Apply coupon error:", err);
    res.status(500).json({ success:false, message: "Failed to apply coupon" });
  }
});


export default router;