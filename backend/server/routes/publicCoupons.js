// server/routes/publicCoupons.js
import express from "express";
import Coupon from "../models/Coupon.js";
import Order from "../models/order.js";
import { validateCouponHandler } from "../controllers/couponsController.js";

const router = express.Router();

/**
 * GET /api/coupons/validate?code=XXX&subtotal=123&email=...
 * Response: { valid: true, discount: 123.45, coupon: {...} } or { valid:false, reason: "..." }
 */
router.get("/validate", validateCouponHandler);
export default router;
