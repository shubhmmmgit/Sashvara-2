// backend/index.js (or server.js)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import path from "path";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

const app = express();

// whitelist origins (add any other frontends you need)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://sashvara.netlify.app",
];

// cors options
const corsOptions = {
  origin: (origin, callback) => {
    // origin will be undefined for non-browser tools (curl/postman)
    console.log("[CORS] incoming origin:", origin || "(no origin)");
    if (!origin) {
      console.log("[CORS] allowing non-browser tool (no origin).");
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log("[CORS] allowed origin:", origin);
      return callback(null, true);
    }

    console.warn("[CORS] blocked origin:", origin);
    // keep behavior of not sending CORS headers for blocked origins
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Apply CORS globally (before routes)
app.use(cors(corsOptions));

// Explicitly respond to preflight OPTIONS requests for all routes
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// small request logger for debugging
app.use((req, res, next) => {
  console.log("[REQ]", req.method, req.url, "origin:", req.get("origin") || "-");
  next();
});

connectDB();

app.get("/health", (req, res) => res.json({ ok: true }));

// API routes
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/upload", uploadRoutes);

// Serve static files from /public
app.use(express.static(path.join(process.cwd(), "public")));

/*
  Serve images with explicit caching and CORS header.
  Note: we set Access-Control-Allow-Origin to '*' for image assets to make them
  easy to fetch from any origin (images are non-sensitive). Keep this if you
  prefer wide image caching. If you rely on credentials for images, change '*' to a specific origin.
*/
app.use(
  "/images",
  (req, res, next) => {
    // allow images to be fetched from anywhere (no credentials)
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(process.cwd(), "public", "images"), {
    maxAge: "30d",
    etag: true,
    lastModified: true,
  })
);

// Optional: generic error handler to catch CORS issues and return clearer message
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes("CORS")) {
    return res.status(403).json({ success: false, message: "CORS blocked: origin not allowed" });
  }
  // fallback
  console.error("Unhandled error:", err);
  return res.status(500).json({ success: false, message: "Internal server error" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));
