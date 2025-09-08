// scripts/seedProducts.js
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../server/models/product.js"; // adjust path if needed

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sashvara";

// --- Helper: normalize keys ---
function normalizeKeys(obj) {
  const map = {
    "sell_price ": "sell_price",
    " mrp": "mrp",
    "categor": "category",
    "category ": "category",
    " category": "category",
  };

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      const trimmedKey = k.trim();
      const normalizedKey = map[k] || map[trimmedKey] || trimmedKey;
      return [normalizedKey, v];
    })
  );
}

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Load JSON
    const filePath = path.resolve("data", "sashvara.products.json");
    const products = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Clean and normalize
    const cleanedProducts = products.map((p) => {
      const { _id, ...rest } = p;
      const normalized = normalizeKeys(rest);

      return {
        product_id: normalized.product_id,
        product_name: normalized.product_name,
        category: normalized.category || "Uncategorized",
        size: normalized.size || null,
        colour: normalized.colour || null,
        mrp: Number(normalized.mrp) || 0,
        sell_price: Number(normalized.sell_price) || Number(normalized.mrp) || 0, // fallback
        gender: normalized.gender || "Unisex",
        images: normalized.images || [],
      };
    });

    // Reset collection
    await Product.deleteMany({});
    console.log("🗑️ Cleared old products");

    // Insert new
    await Product.insertMany(cleanedProducts);
    console.log(`✅ Seeded ${cleanedProducts.length} products successfully`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
