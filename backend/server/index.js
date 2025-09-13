import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";

dotenv.config();

const app = express();

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173",        // Vite dev
  "https://sashvara.netlify.app", // Netlify production
];

// ✅ Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman/server-to-server
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy does not allow access from the origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // if you need cookies/auth headers
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Connect DB
connectDB();

// ✅ Routes
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);

// ❌ Removed serving frontend from backend
// (since frontend is on Netlify)

// ✅ Start server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));
