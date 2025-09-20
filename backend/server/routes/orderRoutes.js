import express from "express";
import Order from "../models/order.js"; // make sure you created order.js schema

const router = express.Router();

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Public (you can add auth later)
 */
router.post("/", async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error(" Error saving order:", err);
    res.status(500).json({ error: "Failed to save order",  details: err.message  });
  }
});

/**
 * @route   GET /api/orders
 * @desc    Get all orders
 * @access  Admin (add auth later)
 */
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(" Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get a single order by ID
 * @access  Public (or Admin)
 */
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});
/**
 * @route   PUT /api/orders/:id
 * @desc    Update order status (e.g., pending → shipped → delivered)
 * @access  Admin
 */
router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status || order.status;
    await order.save();

    res.json(order);
  } catch (err) {
    console.error(" Error updating order:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

router.post("/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_MODE === "test"
        ? process.env.RAZORPAY_TEST_KEY_SECRET
        : process.env.RAZORPAY_LIVE_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    res.json({ status: "success" });
  } else {
    res.status(400).json({ status: "failure" });
  }
});
router.get("/my", async (req, res) => {
  try {
    // If you will add auth later, check req.user and return only their orders.
    // For now, return orders sorted newest-first.
    const orders = await Order.find().sort({ createdAt: -1 }).limit(20); // limit to 20
    // return array (could be [] if none)
    return res.json(orders);
  } catch (err) {
    console.error("Error in GET /api/orders/:", err);
    return res.status(500).json({ error: "Failed to fetch user's orders" });
  }
});
export default router;
