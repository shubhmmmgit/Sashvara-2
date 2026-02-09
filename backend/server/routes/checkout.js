// backend/server/routes/checkouts.js
import express from "express";
import CheckoutSession from "../models/checkoutSession.js";
import Order from "../models/order.js";
import { sendEmail } from "../../utils/sendEmail.js";

const router = express.Router();


// Create a checkout session when user submits Checkout Details
router.post("/", async (req, res) => {
  try {
    const { userData = {}, items = [], paymentStatus = "not_started" } = req.body;
    const doc = await CheckoutSession.create({
      sessionId: undefined, // we will fallback to _id
      userData,
      items,
      paymentStatus,
    });
    // store a string sessionId for easier front-end use
    doc.sessionId = doc._id.toString();
    await doc.save();

    return res.json({ success: true, session: doc });
  } catch (err) {
    console.error("Create checkout session error:", err);
    return res.status(500).json({ error: "server", message: err.message });
  }
});

// Update session (status/metadata) - used by Payment page
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body; // e.g. { paymentStatus: "pending" } or paymentMeta etc.
    const doc = await CheckoutSession.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "not_found" });
    return res.json({ success: true, session: doc });
  } catch (err) {
    console.error("Update checkout session error:", err);
    return res.status(500).json({ error: "server", message: err.message });
  }
});

// Optional: complete session -> create Order and mark session completed+link order
router.post("/:id/complete", async (req, res) => {
  try {
    const id = req.params.id;
    const session = await CheckoutSession.findById(id).lean();
    if (!session) return res.status(404).json({ error: "not_found" });

    if (session.paymentStatus === "completed") {
      return res.json({ success: true, message: "already completed" });
    }
   
    // create order payload using session data (adapt to your Order schema)
    const orderPayload = {
      email: session.userData.email,
      phone: session.userData.phone,
      country: session.userData.country || "India",
      firstName: session.userData.firstName,
      lastName: session.userData.lastName,
      address: session.userData.address,
      apartment: session.userData.apartment,
      city: session.userData.city,
      state: session.userData.state,
      pincode: session.userData.pincode,
      paymentMethod: session.paymentMeta?.method || "prepaid",
      currency: "INR",
      cartItems: session.items,
      total: (session.items || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0),
      amountPaid: session.paymentMeta?.amountPaid || 0,  
      balanceDue: Math.max(0, total - (session.paymentMeta?.amountPaid || 0)),
      discountCode: "",
      status: "paid",
      trackingHistory: [],
    };

    const order = await Order.create(orderPayload);
    await sendEmail(
  "teamsashvara@gmail.com",
  "📦 New Order Received",
  `A new order has been placed. Order ID: ${order._id}`,
  `<h2>New Order Received</h2>
   <p><strong>Order ID:</strong> ${order._id}</p>
   <p><strong>Total:</strong> ₹${order.total}</p>
   <p><strong>Customer Email:</strong> ${order.email}</p>
   <p><strong>Phone:</strong> ${order.phone}</p>`
   );
   await sendEmail(
  order.email,
  "🛒 Order Confirmation",
  `Thank you for your order! Your Order ID is ${order._id}`,
  `<h2>Thank you for your order!</h2>
   <p>Your Order ID: <strong>${order._id}</strong></p>
   <p>Total Amount: ₹${order.total}</p>
   <p>We will notify you when your order is shipped.</p>`
  );
    // update session
    await CheckoutSession.findByIdAndUpdate(id, { paymentStatus: "completed", orderId: order._id }, { new: true });

    return res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error("Complete checkout session error:", err);
    return res.status(500).json({ error: "server", message: err.message });
  }
});

export default router;
