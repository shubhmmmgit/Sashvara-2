// server/config/razorpay.js
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Razorpay from "razorpay";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load server/.env (one level up from config/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// helpful debug logs (temporary - remove when stable)
console.log("Razorpay config: cwd=", process.cwd(), "configDir=", __dirname);
console.log("RAZORPAY_MODE=", process.env.RAZORPAY_MODE);

// Interpret mode: 'live' -> live keys, anything else -> test
const isLive = String(process.env.RAZORPAY_MODE || "").toLowerCase() === "live";

// choose keys correctly
const key_id = isLive ? process.env.RAZORPAY_LIVE_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
const key_secret = isLive ? process.env.RAZORPAY_LIVE_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;

console.log("Using Razorpay mode:", isLive ? "LIVE" : "TEST");
console.log("Key present?", !!key_id, "Secret present?", !!key_secret);

if (!key_id || !key_secret) {
  console.error("Missing Razorpay env vars", {
    RAZORPAY_MODE: process.env.RAZORPAY_MODE,
    RAZORPAY_TEST_KEY_ID: !!process.env.RAZORPAY_TEST_KEY_ID,
    RAZORPAY_TEST_KEY_SECRET: !!process.env.RAZORPAY_TEST_KEY_SECRET,
    RAZORPAY_LIVE_KEY_ID: !!process.env.RAZORPAY_LIVE_KEY_ID,
    RAZORPAY_LIVE_KEY_SECRET: !!process.env.RAZORPAY_LIVE_KEY_SECRET,
  });
  throw new Error("Missing Razorpay env vars. Check server/.env and names on Render.");
}

export default new Razorpay({ key_id, key_secret });
