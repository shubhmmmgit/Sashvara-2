// server/lib/couponUtils.js
import Coupon from "../models/Coupon.js";

/**
 * validateAndCalculateCoupon
 * - Validates coupon for subtotal & user
 * - Returns discount amount and coupon document (but does NOT mutate DB)
 */
export async function validateAndCalculateCoupon(code, subtotal, userId = null) {
  if (!code) return { valid:false, message: "No coupon provided" };
  const normalized = String(code).toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: normalized });

  if (!coupon) return { valid:false, message: "Coupon not found" };
  if (!coupon.active) return { valid:false, message: "Coupon is inactive" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid:false, message: "Coupon expired" };
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return { valid:false, message: "Coupon usage limit reached" };
  if (subtotal < (coupon.minOrderValue || 0)) return { valid:false, message: `Minimum order ₹${coupon.minOrderValue} required` };
  if (coupon.singleUsePerUser && userId) {
    if ((coupon.redemptions || []).some(r => String(r.user) === String(userId))) {
      return { valid:false, message: "Coupon already used by this user" };
    }
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = subtotal * (coupon.value / 100);
    if (coupon.maxDiscount && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }

  // Bound discount
  discount = Math.max(0, Math.min(discount, subtotal));

  return {
    valid: true,
    message: "Coupon is valid",
    discountAmount: Math.round(discount * 100) / 100, // round to 2dp
    couponId: coupon._id,
    coupon
  };
}
