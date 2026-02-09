// backend/controllers/couponsController.js
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import Order from "../models/order.js"; // adjust path if your Order model name/path differs

function computeDiscount(coupon, subtotal) {
  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.round((subtotal * (coupon.value / 100)) * 100) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
  } else {
    discount = coupon.value;
  }
  return discount;
}

// GET /api/coupons/validate?code=GRABNOW25&subtotal=800&paymentMethod=upi&userId=...
export async function validateCouponHandler(req, res) {
  try {
    const code = (req.query.code || "").toString().toUpperCase().trim();
    const subtotal = Number(req.query.subtotal || 0);
    const paymentMethod = req.query.paymentMethod || null;
    const userId = req.query.userId || null;

    if (!code) return res.status(400).json({ valid: false, reason: "Missing code" });

    const coupon = await Coupon.findOne({ code }).lean();
    if (!coupon) return res.status(200).json({ valid: false, reason: "Invalid coupon" });

    if (!coupon.active) return res.status(200).json({ valid: false, reason: "Coupon not active" });
    if (coupon.clientOnly) return res.status(200).json({ valid: false, reason: "Coupon not available" });

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(200).json({ valid: false, reason: "Coupon expired" });
    }

    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return res.status(200).json({ valid: false, reason: `Minimum order value ₹${coupon.minOrderValue} required` });
    }

    if (Array.isArray(coupon.allowedPaymentMethods) && coupon.allowedPaymentMethods.length) {
      if (!paymentMethod || !coupon.allowedPaymentMethods.includes(paymentMethod)) {
        return res.status(200).json({ valid: false, reason: "Not valid for selected payment method" });
      }
    }

    if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(200).json({ valid: false, reason: "Coupon usage limit reached" });
    }

    if (coupon.singleUsePerUser && userId) {
      const already = (coupon.redemptions || []).some(r => String(r.user) === String(userId));
      if (already) return res.status(200).json({ valid: false, reason: "Coupon already used by this user" });
    }

    const discount = computeDiscount(coupon, subtotal);
    return res.json({
      valid: true,
      discount,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
      }
    });
  } catch (err) {
    console.error("validateCouponHandler error:", err);
    return res.status(500).json({ valid: false, reason: "Server error" });
  }
}
