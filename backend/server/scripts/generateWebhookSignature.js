import crypto from "crypto";

const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "9f3c723e13f3ba43a56539fb562d54674e73d6472418167bee3595b997f71ad8";

const payload = JSON.stringify({
  event: "payment.captured",
  id: "evt_test_123",
  payload: {
    payment: {
      entity: {
        id: "pay_test_123",
        order_id: "order_test_123",
        amount: 1000,
        currency: "INR"
      }
    }
  }
});

const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
console.log("X-Razorpay-Signature:", signature);
console.log("Copy this signature into Postman header.");
