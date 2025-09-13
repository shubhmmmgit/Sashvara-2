import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();

const app = express();


const allowedOrigins = [
  "http://localhost:5173",        
  "https://sashvara.netlify.app", 
];


app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); 
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy does not allow access from the origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


connectDB();

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);
app.use("/api/orders", orderRoutes);


const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));
