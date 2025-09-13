import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import path from

dotenv.config();

const app = express();


const allowedOrigins = [
  "http://localhost:5173",        
  "https://sashvara.netlify.app", 
];


app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


connectDB();

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use(
  "/images",
  (req, res, next) => {
    // allow your Netlify origin specifically or use "*" for permissive access
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(process.cwd(), "public/images"))
);
app.use("/uploads", express.static("uploads"));



const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));
