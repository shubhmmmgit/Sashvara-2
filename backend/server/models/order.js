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
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },                
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
        text: String,
      },
    ],
    customOrderId: { type: String, unique: true },

    placedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, createdAt: -1 });

orderSchema.pre("save", async function (next) {
  if (!this.customOrderId) {
    const lastOrder = await this.constructor.findOne().sort({ createdAt: -1 });

    if (!lastOrder || !lastOrder.customOrderId) {
      this.customOrderId = "sash1001";
    } else {
      const lastNum = parseInt(lastOrder.customOrderId.replace("sash", ""), 10);
      this.customOrderId = "sash" + (lastNum + 1);
    }
  }
  next();
});

export default mongoose.model("Order", orderSchema);
