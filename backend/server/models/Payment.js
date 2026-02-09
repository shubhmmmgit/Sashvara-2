import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  razorpayId: { type: String, required: true, unique: true, index: true },
  razorpayOrderId: { type: String },
  amount: { type: Number },
  currency: { type: String },
  status: { type: String },
  raw: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
