// backend/index.js (or server.js) — full corrected file
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import path from "path";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://sashvara.netlify.app",
];

// --- CORS: allow requests from the whitelist (works with arrays)
app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser tools like curl (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS policy: Origin not allowed"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// small request logger for debugging
app.use((req, res, next) => {
  console.log("[REQ]", req.method, req.url);
  next();
});

connectDB();

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);


app.use(express.static(path.join(process.cwd(), "public")));


app.use(
  "/images",
  (req, res, next) => {
    
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(process.cwd(), "public", "images"))
);

// If you later serve an SPA index.html as a catch-all, make sure this comes AFTER static and API routes:
// app.get('*', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'index.html')));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));
