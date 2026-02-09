// server/routes/payment.js  (or server/routes/payment/index.js - replace the file you use)
import express from "express";
import razorpay from "../config/razorpay.js"; // path exactly as in your project
import crypto from "crypto";

const router = express.Router();

router.post("/order", async (req, res) => {
  try {
    console.log("[/api/payment/order] body:", req.body);

    const { amount, currency = "INR", receipt = `rcpt_${Date.now()}` } = req.body || {};
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "amount is required and must be > 0" });
    }

    // backend should accept amount in rupees; convert to paise for Razorpay
    const paise = Math.round(Number(amount) * 100);

    // create order on Razorpay
    const orderPayload = { amount: paise, currency, receipt, payment_capture: 1 };
    console.log("[/api/payment/order] creating razorpay order with:", orderPayload);

    const order = await razorpay.orders.create(orderPayload);
    console.log("[/api/payment/order] razorpay order created:", { id: order.id, amount: order.amount });

    return res.json(order);
  } catch (err) {
    // log the actual error object clearly
    console.error("[/api/payment/order] Razorpay error:", err && (err.error || err));
    // Respond with a stringified error to make client logs useful
    const safeErr = err && err.error ? err.error : err;
    return res.status(500).json({ message: "Razorpay order creation failed", error: JSON.stringify(safeErr) });
  }
});

router.post("/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // choose correct secret according to RAZORPAY_MODE
    const isLive = String(process.env.RAZORPAY_MODE || "").toLowerCase() === "live";
    const secret = isLive ? process.env.RAZORPAY_LIVE_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;
    if (!secret) {
      console.error("/api/payment/verify: missing secret in env");
      return res.status(500).json({ success: false, message: "Server not configured" });
    }

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      return res.json({ status: "success" });
    }
    return res.status(400).json({ status: "failure" });
  } catch (err) {
    console.error("/api/payment/verify err:", err);
    return res.status(500).json({ success: false, message: "Verification failed", error: String(err) });
  }
});

export default router;
