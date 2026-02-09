// scripts/fixBalanceDue.js
import mongoose from "mongoose";
import Order from "../models/order.js"; // adjust path if needed
import dotenv from "dotenv";
dotenv.config();

async function recomputeForOrder(order) {
  const items = order.cartItems || [];
  const computedSubtotal = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 0)), 0);
  const discount = Number(order.discount || 0);
  const shippingCharge = Number(order.shippingCharge || 0);
  const total = Math.max(0, computedSubtotal - discount + shippingCharge);

  const amountPaid = Number(order.amountPaid || 0);
  const balanceDue = Math.max(0, total - amountPaid);

  order.subtotal = computedSubtotal;
  order.total = total;
  order.amountPaid = amountPaid;
  order.balanceDue = balanceDue;
  order.paymentType = balanceDue === 0 ? "prepaid" : (amountPaid === 0 ? "cod" : "partial");

  await order.save();
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { /* options */ });
  console.log("Connected to mongo");

  // find orders where balanceDue is missing OR suspicious (zero while total > 0 and amountPaid < total)
  const q = {
    $or: [
      { balanceDue: { $exists: false } },
      { balanceDue: 0, amountPaid: { $exists: true }, total: { $exists: true }, $expr: { $lt: ["$amountPaid", "$total"] } }
    ]
  };

  const cursor = Order.find(q).cursor();
  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      await recomputeForOrder(doc);
      count++;
      console.log("Fixed order:", doc._id.toString(), "new balanceDue:", doc.balanceDue);
    } catch (err) {
      console.error("Error fixing", doc._id.toString(), err);
    }
  }

  console.log("Done. Fixed", count, "orders.");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
