// server/routes/home.js
import express from "express";
import Product from "../models/product.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const limit = 10;

    const [bestSellers, newArrivals, men, women] = await Promise.all([
      Product.find({ bestSeller: true })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),

      Product.find({ newArrival: true, bestSeller: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),

      Product.find({ gender: "men" }).limit(limit).lean(),
      Product.find({ gender: "women" }).limit(limit).lean(),
    ]);

    res.json({
      success: true,
      data: { bestSellers, newArrivals, men, women },
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

export default router;
