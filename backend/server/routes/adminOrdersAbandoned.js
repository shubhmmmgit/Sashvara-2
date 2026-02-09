// server/routes/adminOrdersAbandoned.js
import express from "express";
import Order from "../models/order.js"; // adjust path if different

const router = express.Router();

router.get("/abandoned", async (req, res) => {
  try {
    // parse/validate params safely
    const olderThanMinutes = Math.max(1, Math.min(parseInt(req.query.olderThanMinutes || "60", 10) || 60, 60 * 24 * 30));
    const unpaidMethodsRaw = req.query.unpaidMethods || "";
    const unpaidMethods = String(unpaidMethodsRaw)
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10) || 50, 1), 1000);

    // cutoff time
    const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    // base query: created at or before cutoff, not final statuses
    const finalStates = ["paid", "confirmed", "shipped", "delivered", "cancelled"];
    const q = {
      createdAt: { $lte: cutoffDate },
      status: { $nin: finalStates },
    };

    // if unpaidMethods specified, filter by paymentMethod
    if (unpaidMethods.length > 0) q.paymentMethod = { $in: unpaidMethods };

    // default: treat amountPaid > 0 as not abandoned (you can override with ?ignorePaid=false)
    if (req.query.ignorePaid === undefined || String(req.query.ignorePaid).toLowerCase() !== "false") {
      q.$or = [{ amountPaid: { $exists: false } }, { amountPaid: 0 }];
    }

    // perform query
    const orders = await Order.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return res.json({
      success: true,
      meta: { olderThanMinutes, unpaidMethods, cutoff: cutoffDate.toISOString(), limit, returned: orders.length },
      orders,
    });
  } catch (err) {
    // log stack trace to server console so you can see exact problem
    console.error("[/api/orders/abandoned] handler error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Failed to fetch order", error: String(err?.message || err) });
  }
});

export default router;
