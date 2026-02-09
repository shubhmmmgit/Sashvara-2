// server/routes/adminCoupon.js
import express from "express";
import Coupon from "../models/Coupon.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

// protect all admin coupon routes
router.use(isAdmin);

// POST /admin/api/coupons  - create
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const code = (body.code || "").toUpperCase().trim();
    if (!code) return res.status(400).json({ success: false, error: "code required" });

    const exists = await Coupon.findOne({ code });
    if (exists) return res.status(409).json({ success: false, error: "coupon exists" });

    const coupon = new Coupon({
      code,
      type: body.type || "percentage",
      value: Number(body.value || 0),
      maxDiscount: Number(body.maxDiscount || 0),
      minOrderValue: Number(body.minOrderValue || 0),
      usageLimit: Number(body.usageLimit || 0),
      singleUsePerUser: Boolean(body.singleUsePerUser),
      active: body.active !== false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: req.user?._id || null,
    });

    await coupon.save();
    return res.json({ success: true, coupon });
  } catch (err) {
    console.error("adminCoupon.create err:", err);
    return res.status(500).json({ success: false, error: "server_error" });
  }
});

// GET /admin/api/coupons - list
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, coupons });
  } catch (err) {
    console.error("adminCoupon.list err:", err);
    return res.status(500).json({ success: false, error: "server_error" });
  }
});

// PUT /admin/api/coupons/:id - update
router.put("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, error: "not_found" });

    const allowed = ["type","value","maxDiscount","minOrderValue","usageLimit","singleUsePerUser","active","expiresAt"];
    allowed.forEach(k => { if (typeof req.body[k] !== "undefined") coupon[k] = req.body[k]; });

    await coupon.save();
    return res.json({ success: true, coupon });
  } catch (err) {
    console.error("adminCoupon.update err:", err);
    return res.status(500).json({ success: false, error: "server_error" });
  }
});

// DELETE /admin/api/coupons/:id
router.delete("/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error("adminCoupon.delete err:", err);
    return res.status(500).json({ success: false, error: "server_error" });
  }
});

export default router;
