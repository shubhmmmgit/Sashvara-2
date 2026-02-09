export function mapOrderToShiprocketPayload(order) {
  if (!order.email || !/\S+@\S+\.\S+/.test(order.email)) {
    throw new Error("Order has invalid email: " + order.email);
  }

  // prefer your branded/custom order id for channel_order_id
  const channelOrderId = order.customOrderId || order._id?.toString();

  // compute balance and payment mode defensively
  const balanceDue = Number(order.balanceDue || 0);
  const isCod = balanceDue > 0;

  return {
    // use channel_order_id as your reference (Shiprocket shows this in dashboard)
    channel_order_id: channelOrderId,

    // keep Shiprocket's own order_id out of the create payload (they return it)
    order_date: new Date(order.createdAt || Date.now())
      .toISOString()
      .slice(0, 19)
      .replace("T", " "), // YYYY-MM-DD HH:mm:ss

    pickup_location: order.pickupLocation || "warehouse",

    billing_customer_name: order.firstName || "NA",
    billing_last_name: order.lastName || "NA",
    billing_address:
      `${order.address || ""}` + (order.apartment ? ", " + order.apartment : ""),
    billing_city: order.city || "NA",
    billing_pincode: order.pincode || "000000",
    billing_state: order.state || "NA",
    billing_country: order.country || "India",
    billing_email: order.email,
    billing_phone: order.phone || "0000000000",

    // Map payment: if there's a balance, mark COD and set the courier collect amount
    payment_method: isCod ? "COD" : "Prepaid",
    // order_total is used as the amount courier collects for COD; set to balanceDue
    order_total: isCod ? balanceDue : 0,

    // keep subtotal/discount/full total for bookkeeping
    sub_total: Number(order.subtotal || 0),
    total_discount: Number(order.discount || 0),
    order_amount: Number(order.total || 0),

    order_items: (order.cartItems || []).map((item, idx) => ({
      name: item.name,
      sku: item._id?.toString() || `SKU-${idx + 1}`,
      units: item.qty || 1,
      selling_price: item.price || 0,
    })),

    shipping_is_billing: true,
    length: order.length || 10,
    breadth: order.breadth || 10,
    height: order.height || 10,
    weight: order.weight || 0.5,
  };
}
