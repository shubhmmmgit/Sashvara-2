import express from "express";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";

const router = express.Router();

// Create order
router.post("/order", async (req, res) => {


  try {

    console.log("BODY:", req.body);
    console.log("KEY_ID:", process.env.RAZORPAY_TEST_KEY_ID);
    console.log("SECRET:", process.env.RAZORPAY_TEST_KEY_SECRET ? "exists" : "missing");

    const { amount, currency = "INR", receipt = "receipt#1" } = req.body;
  if (!amount) {
    return res.status(400).json({ message: "Amount is required" });
}
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt,
    });
    res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay error:", error);
    res.status(500).json({ message: error.message, details: error });

  }
});

// Verify payment
router.post("/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_MODE === "test"
        ? process.env.RAZORPAY_TEST_KEY_SECRET
        : process.env.RAZORPAY_LIVE_KEY_SECRET)

    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    res.json({ status: "success" });  
  } else {
    res.status(400).json({ status: "failure" });
  }
});

export default router;
