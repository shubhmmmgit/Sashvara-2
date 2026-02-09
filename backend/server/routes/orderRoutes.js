// server/routes/orders.js
import express from "express";
import mongoose from "mongoose";
import Order from "../models/order.js";
import Coupon from "../models/Coupon.js";
import { sendEmail } from "../../utils/sendEmail.js"; // adjust path if necessary

const router = express.Router();

function computeDiscountFromCoupon(coupon, subtotal) {
  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.round((subtotal * (coupon.value / 100)) * 100) / 100;
    if (coupon.maxDiscount && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }
  return Math.min(discount, subtotal);
}

/**
 * GET /api/orders
 * Dev-only: list recent orders. Remove or protect in production.
 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 500);
    const orders = await Order.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, total: orders.length, orders });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return res.status(500).json({ success: false, error: "server error" });
  }
});

/**
 * POST /api/orders
 * Create order (validates inputs, optional coupon handling, atomic reserve)
 */
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payload = req.body || {};
    const {
      couponCode,
      cartItems = [],
      shippingCost = 0,
      email,
      phone,
      firstName,
      lastName,
      address,
      apartment,
      city,
      state,
      pincode,
      country,
      paymentMethod,
      amountPaid = 0,
      customOrderId,
      userId = null // optional
    } = payload;

    // quick required-field validation BEFORE touching DB
    if (!email || !phone || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, phone and paymentMethod are required"
      });
    }

    // compute authoritative subtotal server-side
    const subtotal = (cartItems || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 0)), 0);

    // handle coupon validation + atomic reserve (if couponCode provided)
    let discount = 0;
    let couponId = null;
    if (couponCode) {
      const code = String(couponCode || "").toUpperCase().trim();
      const coupon = await Coupon.findOne({ code }).session(session);
      if (!coupon) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "invalid coupon" });
      }
      if (!coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "coupon not available" });
      }
      if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minOrderValue} required` });
      }
      if (coupon.allowedPaymentMethods && coupon.allowedPaymentMethods.length && !coupon.allowedPaymentMethods.includes(paymentMethod)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Coupon not valid for this payment method" });
      }
      if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
      }
      if (coupon.singleUsePerUser && userId) {
        const already = (coupon.redemptions || []).some(r => String(r.user) === String(userId));
        if (already) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ success: false, message: "Coupon already used by this user" });
        }
      }

      // calculate discount
      discount = computeDiscountFromCoupon(coupon, subtotal);

      // atomic reserve: increment usedCount and append redemption (if applicable)
      const updateOps = { $inc: { usedCount: 1 } };
      if (coupon.singleUsePerUser && userId) {
        updateOps.$push = { redemptions: { user: mongoose.Types.ObjectId(userId), usedAt: new Date() } };
      }

      // prevent race beyond usageLimit
      const condition = { _id: coupon._id };
      if (coupon.usageLimit && coupon.usageLimit > 0) {
        condition.usedCount = { $lt: coupon.usageLimit };
      }

      const updated = await Coupon.findOneAndUpdate(condition, updateOps, { new: true, session });
      if (!updated && coupon.usageLimit && coupon.usageLimit > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Coupon usage limit reached (race)" });
      }
      couponId = coupon._id;
    }

    // compute totals
    const total = Math.max(0, subtotal - (discount || 0) + Number(shippingCost || 0));
    const balanceDue = Math.max(0, total - Number(amountPaid || 0));
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    const generatedOrderId = `SASH-${datePart}-${randomPart}`;

    // create minimal order doc (fast)
    const orderDoc = {
      email,
      phone,
      firstName,
      lastName,
      address,
      apartment,
      city,
      state,
      pincode,
      country,
      paymentMethod,
      cartItems,
      subtotal,
      shippingCost,
      discount,
      total,
      amountPaid,
      balanceDue,
      customOrderId: customOrderId || generatedOrderId,
      couponCode: couponCode ? String(couponCode).toUpperCase().trim() : null,
      couponRef: couponId || null,
      status: balanceDue === 0 ? "paid" : (amountPaid > 0 ? "partial" : "pending"),
      createdAt: new Date()
    };

    const [order] = await Order.create([orderDoc], { session }); // create in session

    // commit quickly
    await session.commitTransaction();
    session.endSession();

    // send emails asynchronously (fire-and-forget)
 setImmediate(async () => {
  try {
    await sendEmail(
      process.env.EMAIL_USER, // your store email
      "📦 New Order Received",
      `A new order has been placed. Order ID: ${order.customOrderId}`,
      `<h2>New Order Received</h2>
       <p><strong>Order ID:</strong> ${order.customOrderId}</p>
       <p><strong>Customer:</strong> ${order.firstName} ${order.lastName}</p>
       <p><strong>Total:</strong> ₹${order.total}</p>
       <p><strong>Payment:</strong> ${order.paymentMethod}</p>`
    );
  } catch (err) {
    console.error("async owner email failed:", err);
  }
});

setImmediate(async () => {
  try {
    if (email) {
      await sendEmail(
        email,
        "🛒 Order Confirmation",
        `Thank you! Your Order ID: ${order.customOrderId}`,
        `<p>Order ID: <strong>${order.customOrderId}</strong></p><p>Total: ₹${order.total}</p>`
      );
    }
  } catch (err) {
    console.error("async customer email failed:", err);
  }
});

    // return created order
    return res.status(201).json({ success: true, order });
  } catch (err) {
    console.error("Create order failed:", err);
    try { await session.abortTransaction(); session.endSession(); } catch(e) {/* ignore */ }
    return res.status(500).json({ success: false, message: "Order creation failed", error: String(err?.message || err) });
  }
});

export default router;
