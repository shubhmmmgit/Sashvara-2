import axios from "axios";
import crypto from "crypto";

const url = "https://sashvara-2.onrender.com/api/payment/webhook";

// Use your actual webhook secret
const secret = "teamsashvara2004";
const now = Date.now();
const payloadObj = {
  event: "payment.captured",
  id: `evt_test_${now}`, // Change each test if needed
  payload: {
    payment: {
      entity: {
        id: `pay_test_${now}`,
        order_id: `order_test_${now}`,
        amount: 1000,
        currency: "INR"
      }
    }
  }
};

const rawPayload = JSON.stringify(payloadObj);

// Generate signature
const signature = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");

console.log("Generated X-Razorpay-Signature:", signature);

(async () => {
  try {
    const response = await axios.post(url, rawPayload, {
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature
      }
    });
    console.log("Webhook response:", response.data);
  } catch (err) {
    console.error("Webhook error:", err.response?.data || err.message);
  }
})();
