import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // Contact
    email: { type: String, required: true },
    phone: { type: String, required: true },

    // Delivery
    country: String,
    firstName: String,
    lastName: String,
    address: String,
    apartment: String,
    city: String,
    state: String,
    pincode: String,

    // Payment
    paymentMethod: { type: String, required: true }, // e.g. Razorpay, COD
    paymentId: { type: String },                     // Razorpay payment id
    amountPaid: { type: Number },                    // actual paid amount
    currency: { type: String, default: "INR" },

    // Cart Items
    cartItems: [
      {
        name: String,
        price: Number,
        qty: Number,
        size: String,
        image: String,
      },
    ],

    // Totals
    total: Number,
    discountCode: String,
    discountPercent: Number,

    // Order Status
    status: {
      type: String,
      enum: ["pending", "unpaid", "paid", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    // Tracking info
    trackingHistory: [
      {
        ts: { type: Date, default: Date.now },
        text: String, // e.g. "Order placed", "Shipped", "Out for delivery"
      },
    ],

    placedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
