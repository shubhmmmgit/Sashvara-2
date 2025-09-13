import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js"; 
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";


//dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowedOrigins = [
  "http://localhost:3000",              // React dev server
  "https://sashvara.vercel.app"         // Production frontend
];


const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true   // If you want to allow cookies or auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../../frontend/dist")));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // dev only; tighten in prod
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use("/images", express.static(path.join(__dirname, "images"), {
  maxAge: 0 // no cache during dev so you don't see stale 304s
}));

// Static files
app.use("/images", express.static(path.join(__dirname, "../../frontend/public/images")));
app.use("/uploads", express.static("uploads"));

// DB connection
connectDB();



// Routes
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/order", paymentRoutes);

app.get("/api/test", (req, res) => {
  res.json({ message: "CORS is working!" });
});

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname,  "../../frontend/dist/index.html"));
});


const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));