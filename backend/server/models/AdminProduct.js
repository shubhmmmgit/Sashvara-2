// backend/server/models/AdminProduct.js
import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema({
  name: String,
  sku: String,
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
});

const ImageSchema = new mongoose.Schema({
  url: String,
  alt: String,
  isPrimary: Boolean,
});

const AdminProductSchema = new mongoose.Schema(
  {
    sku: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    hsn: String,
    images: [ImageSchema],
    variants: [VariantSchema],
    stock: { type: Number, default: 0 },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Use a unique model name and the safe pattern to avoid OverwriteModelError
const AdminProductModel =
  mongoose.models.AdminProduct || mongoose.model("AdminProduct", AdminProductSchema);

export default AdminProductModel;
