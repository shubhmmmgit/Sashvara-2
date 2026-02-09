import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv"; 
import path from "path";


// Webhook secret from your env / Render
dotenv.config({ path: path.resolve("../.env") });

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

// RAW string exactly as it will be sent
const rawPayload = `{
"event":"payment.captured",
"id":"evt_test_456",
"payload":{
  "payment":{
    "entity":{
      "id":"pay_test_123",
      "order_id":"order_test_123",
      "amount":1000,
      "currency":"INR"
    }
  }
}}`;

// Generate signature from the exact same string
const signature = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");

(async () => {
  try {
    const response = await axios.post(
      "https://sashvara-2.onrender.com/api/payment/webhook",
      rawPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Razorpay-Signature": signature
        }
      }
    );
    console.log("Webhook response:", response.data);
  } catch (err) {
    console.error("Webhook error:", err.response?.data || err.message);
  }
})();
