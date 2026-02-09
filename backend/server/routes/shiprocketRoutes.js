// server/routes/shiprocketRoutes.js
import express from "express";
import { shiprocketPost } from "../../utils/shiprocket.js";
import Order from "../models/order.js";
import { mapOrderToShiprocketPayload } from "../../utils/shiprocketMapper.js";


const router = express.Router();
router.get("/ping", (req, res) => res.json({ ok: true, msg: "shiprocket router alive" }));

// POST /api/shiprocket/orders/adhoc
router.post("/orders/adhoc", async (req, res) => {
  try {
    const payload = req.body; // validate/transform this payload in production!
    const data = await shiprocketPost("/orders/create/adhoc", payload);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Shiprocket error:", err?.response?.data || err.message || err);
    res.status(500).json({ success: false, error: err?.response?.data || String(err) });
  }
});

router.post("/sync/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const payload = mapOrderToShiprocketPayload(order);
    const data = await shiprocketPost("/orders/create/adhoc", payload);

    order.shiprocket = {
      order_id: data.order_id || data.data?.order_id || null,
      shipment_id: data.shipment_id || data.data?.shipment_id || null,
      status: data.status || data.data?.status || null,
      awb: data.awb_code || data.data?.awb || null,
      courier: data.courier_name || data.data?.courier_name || null,
      tracking_url: data.tracking_url || data.data?.tracking_url || null,
      raw: data
    };

    await order.save();

    res.json({
      success: true,
      order: { _id: order._id, shiprocket: order.shiprocket },
      shiprocket: data
    });
  } catch (err) {
    console.error("Shiprocket error:", err?.response?.data || err.message || err);
    res.status(500).json({ success: false, error: err?.response?.data || String(err) });
  }
});

export default router;
