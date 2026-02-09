import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, unique: true, trim: true },
  type: { type: String, enum: ["percentage", "fixed"], required: true },
  value: { type: Number, required: true },
  maxDiscount: { type: Number, default: 0 },
  minOrderValue: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  singleUsePerUser: { type: Boolean, default: false },
  redemptions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, usedAt: Date }],
  active: { type: Boolean, default: true },
  allowedPaymentMethods: [{ type: String }],
  expiresAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
  createdAt: { type: Date, default: Date.now },
  clientOnly: { type: Boolean, default: false }
});

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
