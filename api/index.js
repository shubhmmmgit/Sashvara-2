import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js"; 
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "build")));

// Static files
app.use("/images", express.static("public/images"));
app.use("/uploads", express.static("uploads"));

// DB connection
connectDB();



// Routes
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);


app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "build", "index.html"));
});


const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on :${port}`));