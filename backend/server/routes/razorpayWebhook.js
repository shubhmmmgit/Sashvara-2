// server/routes/razorpayWebhook.js
import crypto from "crypto";
import ProcessedEvent from "../models/ProcessedEvent.js";
import Payment from "../models/Payment.js";
import Order from "../models/order.js";
import CheckoutSession from "../models/checkoutSession.js";

export default async function razorpayWebhookHandler(req, res) {
  try {
    console.log("[razorpay webhook] incoming", req.method, req.originalUrl);

    // keep raw bytes as Buffer for exact HMAC verification & parsing
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    console.log("[razorpay webhook] rawBody_len:", (rawBody && rawBody.length) || 0);

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      console.warn("[razorpay webhook] missing signature");
      return res.status(400).send("signature missing");
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[razorpay webhook] RAZORPAY_WEBHOOK_SECRET not set");
      return res.status(500).send("webhook not configured");
    }

    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (expected !== signature) {
      console.warn("[razorpay webhook] signature mismatch");
      return res.status(400).send("invalid signature");
    }

    // signature ok — respond quickly BEFORE heavy processing
    res.status(200).send("ok");

    // Do non-blocking processing
    (async () => {
      try {
        let payload;
        try {
          // rawBody is a Buffer — convert to string for JSON.parse
          payload = JSON.parse(rawBody.toString("utf8"));
        } catch (err) {
          console.error("[razorpay webhook] invalid json payload", err);
          return;
        }

        const event = payload.event;
        const eventId = payload.id;
        const entity = payload.payload || {};

        console.log(`[razorpay webhook][bg] event=${event} id=${eventId}`);

        // Idempotency: if already processed, skip
        if (eventId) {
          const already = await ProcessedEvent.findOne({ razorpayEventId: eventId }).lean();
          if (already) {
            console.log("[razorpay webhook][bg] already processed:", eventId);
            return;
          }
        }

        // Handle payment.captured
        if (event === "payment.captured") {
          const payment = entity?.payment?.entity;
          const paymentId = payment?.id;
          const orderId = payment?.order_id;

          if (paymentId && !(await Payment.exists({ razorpayId: paymentId }))) {
            await Payment.create({
              razorpayId: paymentId,
              razorpayOrderId: orderId,
              amount: payment.amount,
              currency: payment.currency,
              status: "captured",
              raw: payment
            });
          }

          // === NEW: update Order.amountPaid & Order.balanceDue ===
          try {
            // convert paisa -> rupees
            const paidAmount = Number(payment?.amount || 0) / 100;

            // attempt to find the Order by common saved keys
            let order = null;
            if (orderId) {
              order = await Order.findOne({
                $or: [
                  { razorpayOrderId: orderId },
                  { "paymentMeta.razorpay.order_id": orderId },
                  { "paymentMeta.razorpayOrderId": orderId }
                ]
              });
            }

            // fallback: try to find a CheckoutSession with this razorpay order id and create order if needed
            if (!order && orderId) {
              const session = await CheckoutSession.findOne({ "paymentMeta.razorpay.order_id": orderId });
              if (session) {
                if (session.orderId) {
                  order = await Order.findById(session.orderId);
                } else {
                  // create Order from session
                  const total = (session.items || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
                  const amountPaid = paidAmount;
                  const balanceDue = Math.max(0, total - amountPaid);

                  const newOrder = await Order.create({
                    email: session.userData?.email,
                    phone: session.userData?.phone,
                    cartItems: session.items,
                    total,
                    amountPaid,
                    balanceDue,
                    paymentMeta: { razorpay: { order_id: orderId, payment_id: paymentId } },
                    status: balanceDue === 0 ? 'paid' : 'partial',
                    createdAt: new Date()
                  });

                  // link session -> order
                  session.orderId = newOrder._id;
                  session.paymentStatus = 'completed';
                  await session.save();

                  order = newOrder;
                  console.info('[razorpay webhook] created order from session', newOrder._id);
                }
              }
            }

            // If we found an Order, increment amountPaid and recalc balanceDue
            if (order) {
              order.amountPaid = (Number(order.amountPaid || 0) + paidAmount);
              order.balanceDue = Math.max(0, Number(order.total || 0) - order.amountPaid);
              order.status = order.balanceDue === 0 ? 'paid' : (order.amountPaid > 0 ? 'partial' : order.status || 'pending');

              // ensure paymentMeta.razorpay exists and store ids
              order.paymentMeta = order.paymentMeta || {};
              order.paymentMeta.razorpay = order.paymentMeta.razorpay || {};
              order.paymentMeta.razorpay.order_id = order.paymentMeta.razorpay.order_id || orderId;
              order.paymentMeta.razorpay.payment_id = order.paymentMeta.razorpay.payment_id || paymentId;

              await order.save();
              console.info('[razorpay webhook] updated order', order._id.toString(), 'amountPaid:', order.amountPaid, 'balanceDue:', order.balanceDue);
            } else {
              console.warn('[razorpay webhook] no matching order or session for razorpay order:', orderId);
            }
          } catch (orderErr) {
            console.error("[razorpay webhook] error updating/creating order:", orderErr);
          }
          // === END NEW ===

        } else if (event === "payment.failed") {
          const payment = entity?.payment?.entity;
          const paymentId = payment?.id;
          const orderId = payment?.order_id;

          if (paymentId && !(await Payment.exists({ razorpayId: paymentId }))) {
            await Payment.create({
              razorpayId: paymentId,
              razorpayOrderId: orderId,
              amount: payment.amount,
              currency: payment.currency,
              status: "failed",
              raw: payment
            });
          }
        } else if (event && event.startsWith("refund.")) {
          console.log("[razorpay webhook][bg] refund event:", event);
        } else {
          console.log("[razorpay webhook][bg] unhandled event:", event);
        }

        // mark processed
        if (eventId) {
          await ProcessedEvent.create({ razorpayEventId: eventId, event, processedAt: new Date() });
        }
      } catch (bgErr) {
        console.error("[razorpay webhook][bg] processing error:", bgErr);
      }
    })();

  } catch (err) {
    console.error("[razorpay webhook] handler error:", err);
    // If we reached here before sending response, send 500
    if (!res.headersSent) return res.status(500).send("server error");
  }
}
