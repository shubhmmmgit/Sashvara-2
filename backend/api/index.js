import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js"; 
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors()); // allow all origins for now
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB connection
connectDB();

// Routes
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);

// Removed frontend static serving

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));
