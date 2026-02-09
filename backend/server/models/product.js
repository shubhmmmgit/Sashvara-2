// server/models/product.js
import mongoose from "mongoose";
import slugify from "slugify";

const { Schema, model } = mongoose;

/* ---------------------- Variant Schema ---------------------- */
const variantSchema = new Schema(
  {
    size: { type: String, trim: true, required: true },
    mrp: { type: Number, required: true, min: 0 },
    sell_price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    attributes: { type: Schema.Types.Mixed }, // optional extra fields
  },
  { _id: true }
);

/* ---------------------- Product Schema ---------------------- */
const productSchema = new Schema(
  {
    product_id: { type: String, required: true, trim: true, unique: true, index: true },
    product_name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, unique: true }, // SEO-friendly URL key
    category: { type: String, required: true, trim: true },
    colour: { type: String, trim: true },
    gender: { type: String, required: true, trim: true, lowercase: true },
    images: [{ type: String, trim: true }],
    variants: {
      type: [variantSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Product must have at least one variant",
      },
    },
    metadata: { type: Schema.Types.Mixed }, // optional catch-all
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: false, // Allow dynamic fields like 'images/0', 'variants/0/size', etc.
  }
);

/* ---------------------- Indexes ---------------------- */
productSchema.index({ product_name: "text", category: "text", colour: "text" });

/* ---------------------- Virtuals ---------------------- */
// Compute cheapest variant
productSchema.virtual("cheapestVariant").get(function () {
  if (!Array.isArray(this.variants) || this.variants.length === 0) return null;
  return this.variants.reduce((cheapest, v) =>
    (v.sell_price ?? Infinity) < (cheapest.sell_price ?? Infinity) ? v : cheapest
  );
});

/* ---------------------- Static Helpers ---------------------- */
productSchema.statics.findByProductId = function (productId) {
  return this.findOne({ product_id: productId }).exec();
};

productSchema.statics.findByVariantId = function (variantId) {
  return this.findOne(
    { "variants._id": variantId },
    { "variants.$": 1, product_name: 1, product_id: 1, images: 1 }
  ).exec();
};

/* ---------------------- Pre-save Hook ---------------------- */
productSchema.pre("save", function (next) {
  // normalize gender
  if (this.gender && typeof this.gender === "string") {
    this.gender = this.gender.toLowerCase();
  }

  // sanitize images
  if (Array.isArray(this.images)) {
    this.images = this.images
      .map((i) => (typeof i === "string" ? i.trim() : i))
      .filter(Boolean);
  } else {
    this.images = [];
  }

  // sanitize variant sizes
  if (Array.isArray(this.variants)) {
    this.variants = this.variants.map((v) => {
      if (v?.size) v.size = v.size.trim().toUpperCase();
      return v;
    });
  }

  // auto-generate slug from product_name if not set
  if (!this.slug && this.product_name) {
    this.slug = slugify(this.product_name, { lower: true, strict: true });
  }

  next();
});

/* ---------------------- Export ---------------------- */
const Product = model("Product", productSchema);
export default Product;
