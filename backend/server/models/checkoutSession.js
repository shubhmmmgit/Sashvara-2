// backend/server/models/checkoutSession.js
import mongoose from "mongoose";

const CheckoutSessionSchema = new mongoose.Schema(
  {
    // you'll mostly use _id as session id, but keep a string alias if you like
    sessionId: { type: String, index: true },

    userData: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: String,
      apartment: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
      // any extra fields you want to track
    },

    // items: [{ name, price, qty, image }]
    items: [
      {
        name: String,
        price: Number,
        qty: { type: Number, default: 1 },
        image: String,
        sku: String,
        _id: false,
      },
    ],

    // paymentStatus: not_started / pending / completed / failed / abandoned
    paymentStatus: {
      type: String,
      enum: ["not_started", "pending", "completed", "failed", "abandoned"],
      default: "not_started",
      index: true,
    },

    // optional: link to order created when payment completes
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    // when it became abandoned (populated by cron)
    abandonedAt: { type: Date, default: null },

    // any payment provider data you want to store
    paymentMeta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true } // createdAt, updatedAt
);

// helpful index for queries
CheckoutSessionSchema.index({ createdAt: -1, paymentStatus: 1 });

const CheckoutSession = mongoose.models.CheckoutSession || mongoose.model("CheckoutSession", CheckoutSessionSchema);
export default CheckoutSession;
