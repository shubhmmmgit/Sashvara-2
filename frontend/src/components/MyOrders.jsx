// MyOrders.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link, useParams, useNavigate } from "react-router-dom";
import PrimaryButton from "./PrimaryButton";
import axios from "axios";
import { RiShoppingBag3Fill } from "react-icons/ri";
import { PiSmileySad } from "react-icons/pi";

const BACKEND_ORIGIN = (import.meta.env?.VITE_API_ORIGIN || "https://sashvara-2.onrender.com").replace(/\/+$/, "");
const DATA_PLACEHOLDER =
  "https://via.placeholder.com/400x400.png?text=No+Image";

function formatDate(dateInput) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d)) return "-";
  return d.toLocaleString();
}

// Use a default param for initialOrder instead of defaultProps
export default function MyOrders({ order: initialOrder = null }) {
  // orders always an array (either [initialOrder] or fetched list)
  const [orders, setOrders] = useState(initialOrder ? [initialOrder] : []);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { orderId } = useParams();
  const navigate = useNavigate();

  // read customer identity from localStorage
  function getCustomerIdentity() {
    try {
      return JSON.parse(localStorage.getItem("sashvara_customer") || "{}");
    } catch {
      return {};
    }
  }

  useEffect(() => {
    const rawId = orderId;
    const sanitizedId =
      typeof rawId === "string" && rawId.startsWith(":") ? rawId.slice(1) : rawId;

    async function fetchOrderById(id) {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(
          `https://sashvara-2.onrender.com/api/orders/${encodeURIComponent(id)}`
        );
        const payload = res.data?.data ?? res.data;
        setOrders(Array.isArray(payload) ? payload : [payload]);
        return true;
      } catch (err) {
        console.error("Error fetching order by id:", err);
        setError("Failed to fetch order by id.");
        return false;
      } finally {
        setLoading(false);
      }
    }

 
    async function fetchLatestOrderForUser() {
  try {
    setLoading(true);
    setError(null);

    // prefer local orders
    const local = JSON.parse(localStorage.getItem("sashvara_local_orders") || "[]");
    if (Array.isArray(local) && local.length > 0) {
      setOrders(local);
      return true;
    }

    const identity = getCustomerIdentity();
    if (!identity.email && !identity.phone) {
      setOrders([]);
      return true; // no identity -> don't fetch global orders
    }

    let url = `${BACKEND_ORIGIN}/api/orders`;
    const qs = [];
    if (identity.email) qs.push(`email=${encodeURIComponent(identity.email)}`);
    if (identity.phone) qs.push(`phone=${encodeURIComponent(identity.phone)}`);
    if (qs.length > 0) url += `?${qs.join("&")}`;

    const res = await axios.get(url);
    const data = res.data?.orders ?? res.data;
    setOrders(Array.isArray(data) ? data : [data]);
    return true;
  } catch (err) {
    console.error("Error fetching user's orders:", err);
    setError("Failed to fetch orders.");
    setOrders([]);
    return false;
  } finally {
    setLoading(false);
  }
}

    (async () => {
      if (sanitizedId) {
        await fetchOrderById(sanitizedId);
      } else {
        await fetchLatestOrderForUser();
      }
    })();
  }, [orderId]);

  useEffect(() => {
    // if first order is unpaid redirect to cart (normalize status case)
    if (!loading && orders.length > 0) {
      const s = String(orders[0].status || "").toLowerCase();
      if (s === "unpaid") {
        navigate("/cart");
      }
    }
  }, [loading, orders, navigate]);

  if (loading) {
    return <p className="text-center mt-10">Loading order...</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-600">{error}</p>;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center mt-10">
         <p className="mb-4 "style={{fontSize:"1.2rem"}}>You haven't placed any orders yet. <PiSmileySad /></p> 
        <Link to="/" className="px-4 py-2 bg-blue-600 text-[#001f3f] visited:text-[#001f3f] rounded no-underline" style={{fontSize:"1.2rem"}}> 
             <RiShoppingBag3Fill className="" /> Shop now
        </Link>
      </div>
    );
  }  
    function resolveImageUrl(img) {
  if (!img) return DATA_PLACEHOLDER;
  const trimmed = String(img).trim();

  // 1) If already absolute https or http
  if (/^https?:\/\//i.test(trimmed)) {
    // If it points to a localhost url, rewrite to BACKEND_ORIGIN to avoid mixed content / 404
    if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(:\d+)?\/?/i.test(trimmed)) {
      // extract path after host
      const pathPart = trimmed.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(:\d+)?/i, "");
      return `${BACKEND_ORIGIN}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`;
    }
    // Otherwise: external absolute url (leave as-is). Note: http external might be blocked by browser if page is HTTPS.
    return trimmed;
  }

  // 2) If starts with '/images' => prefix backend origin
  if (trimmed.startsWith("/images")) {
    return `${BACKEND_ORIGIN}${trimmed}`;
  }

  // 3) If starts with 'images/' (no leading slash)
  if (trimmed.startsWith("images/")) {
    return `${BACKEND_ORIGIN}/${trimmed}`;
  }

  // 4) bare filename e.g. 'DSC04207_1.png' => map to /images/<filename>
  return `${BACKEND_ORIGIN}/images/${encodeURIComponent(trimmed)}`;
}

  return (
    <div className="max-w-3xl mx-auto mt-6 p-6 rounded-lg shadow-sm font-sans text-[#001f3f]">
      <h2 className="text-xl text-center mt-[5%] font-semibold mb-4">Order Details</h2>

      {orders.map((order, orderIndex) => {
        const isDelivered =
          String(order?.status || "").toLowerCase() === "delivered" || Boolean(order?.delivered);

        const isCancellable =
          order?.status &&
          String(order.status).toLowerCase() !== "unpaid" &&
          !isDelivered &&
          String(order.status).toLowerCase() !== "cancelled";

        function handleCancel() {
          if (!isCancellable) return;
          const ok = window.confirm("Are you sure you want to cancel this order?");
          if (!ok) return;
          setOrders((prev) =>
            prev.map((o, i) =>
              i === orderIndex
                ? { ...o, status: "Cancelled", cancelledAt: new Date().toISOString() }
                : o
            )
          );
        }

        return (
          <div
            key={order._id || orderIndex}
            className="myorderDetail space-y-6 bg-[#FAF9F6] w-[70%] border-color-[#001f3f] ml-[10%] mb-[5%] "
            style={{ border: "2px solid #001f3f", padding: "2%", borderRadius: "8px" }}
          >
            {order.cartItems?.map((item, i) => (
              <div
                key={i}
                className=" grid grid-cols-[120px_1fr] gap-[2%] mb-[5%] items-start p-3 rounded-md"
              >
                <img
                    src={resolveImageUrl(item.image)}
                  alt={item.name}
                  className="myorderImg w-full h-full object-contain"
                   onError={(e) => { e.currentTarget.onerror = null;
                                     e.currentTarget.src = `${BACKEND_ORIGIN}/images/placeholder.png`;
                                     setTimeout(() => {
                   if (e.currentTarget.naturalWidth === 0) {
                  e.currentTarget.src = DATA_PLACEHOLDER;
                }
                }, 200);
                    }}
                />
                <div className="myorderDetail space-y-2">
                  <p className="myordername text-[#001f3f]" style={{ fontSize: "1.3rem", fontWeight: 500 }}>
                    {item.name}
                  </p>
                  <p
                    className="myorderprice text-[#001f3f] font-medium"
                    style={{ fontSize: "1.3rem", fontWeight: 500 }}
                  >
                    ₹{item.price}
                  </p>

                  <div
                    className="myorderinfo grid grid-cols-6 justify-center text-center items-center rounded-md p-1"
                    style={{ fontWeight: 450 }}
                  >
                    <p className="text-sm text-gray-500">
                      Qty: {item.qty} | Size: {item.size}
                    </p>
                    <p>Amount Paid: ₹ {order.amountPaid ?? 0.0} </p>
                    <p>Payment Method: {order.paymentMethod} </p>
                    <p>Order Placed: {formatDate(order.placedAt)} </p>
                  </div>
                </div>x
              </div>
            ))}

            <div className="trackorder flex gap-3 mt-4 justify-end">
              <PrimaryButton
                type="button"
                onClick={() => setTrackingOpen(true)}
                className="px-4 py-2 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 transition"
              >
                Track Order
              </PrimaryButton>
            </div>

            {/* Tracking Modal */}
            {trackingOpen && (
              <div
                className="order-tracking-overlay"
                onClick={() => setTrackingOpen(false)}
              >
                <div
                  className="order-tracking-modal bg-white rounded-lg shadow-lg p-6 w-[480px] max-w-[95%]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold mb-2">
                    Tracking for Order {order._id}
                  </h3>
                  <p className="text-gray-700">
                    Current status:{" "}
                    <strong
                      className={
                        String(order.status).toLowerCase() === "delivered"
                          ? "text-green-600"
                          : "text-blue-600"
                      }
                    >
                      {order.status}
                    </strong>
                  </p>

                  <ul className="list-disc pl-5 text-gray-700 mt-4 space-y-1">
                    {(order.trackingHistory && order.trackingHistory.length > 0
                      ? order.trackingHistory
                      : [
                          { ts: order.placedAt, text: "Order placed" },
                          { ts: order.deliveredAt, text: "Delivered" },
                        ]
                    ).map((h, i) => (
                      <li key={i}>
                        <strong>{formatDate(h.ts)}:</strong> {h.text}
                      </li>
                    ))}
                  </ul>

                  <div className="text-right mt-6">
                    <button
                      type="button"
                      onClick={() => setTrackingOpen(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

MyOrders.propTypes = {
  order: PropTypes.shape({
    orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    productName: PropTypes.string,
    productImage: PropTypes.string,
    amountPaid: PropTypes.number,
    currencySymbol: PropTypes.string,
    paymentMode: PropTypes.string,
    placedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    expectedDelivery: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
    status: PropTypes.string,
    delivered: PropTypes.bool,
    deliveredAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    cancelledAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    trackingHistory: PropTypes.arrayOf(
      PropTypes.shape({
        ts: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.instanceOf(Date),
        ]),
        text: PropTypes.string,
      })
    ),
  }),
};
