import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link, useParams, useNavigate } from "react-router-dom";
import PrimaryButton from "./PrimaryButton";
import axios from "axios";

function formatDate(dateInput) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d)) return "-";
  return d.toLocaleString();
}

export default function MyOrders({ order: initialOrder }) {
  const [order, setOrder] = useState({ ...initialOrder });
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // sanitize orderId in case it contains a leading ":" (happens when link used wrong)
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
        setOrder(res.data);
        return true;
      } catch (err) {
        console.error("Error fetching order by id:", err);
        if (err.response) {
          setError(err.response.data?.message || `Server error (${err.response.status}).`);
        } else if (err.request) {
          setError("No response from server. Is the backend running?");
        } else {
          setError("Failed to fetch order. " + err.message);
        }
        return false;
      } finally {
        setLoading(false);
      }
      
      
    }

    

    async function fetchLatestOrderForUser() {
      try {
        setLoading(true);
        setError(null);
        // expects backend endpoint that returns array or single latest order
        const res = await axios.get("https://sashvara-2.onrender.com/api/orders");
        // backend could return an array or single object; handle both
        const data = res.data;
        if (!data) {
          setOrder(null);
          return false;
        }
        if (Array.isArray(data)) {
          if (data.length === 0) {
            setOrder(null);
            return false;
          }
          // assume the first item is most recent (or sort if backend gives unsorted)
          setOrder(data[0]);
          return true;
        } else {
          // single object
          setOrder(data);
          return true;
        }
      } catch (err) {
        console.error("Error fetching user's orders:", err);
        if (err.response) {
          setError(err.response.data?.message || `Server error (${err.response.status}).`);
        } else if (err.request) {
          setError("No response from server. Is the backend running?");
        } else {
          setError("Failed to fetch orders. " + err.message);
        }
        setOrder(null);
        return false;
      } finally {
        setLoading(false);
      }
    }

    (async () => {
      
      if (sanitizedId) {
        const ok = await fetchOrderById(sanitizedId);
        if (!ok) {
          
        }
      } else {
        await fetchLatestOrderForUser();
      }
    })();
    
  }, [orderId]);

  useEffect(() => {
    if (!loading && order && order.status === "unpaid") {
      navigate("/cart"); 
    }
  }, [loading, order, navigate]);

  if (loading) {
    return <p className="text-center mt-10">Loading order...</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-600">{error}</p>;
  }

  
  if (!order || (Object.keys(order).length === 0 && order.constructor === Object)) {
    return (
      <div className="text-center mt-10">
        <p className="mb-4">You haven't placed any orders yet.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded">
          Shop now
        </Link>
      </div>
    );
  }

//  const isPaid = order?.amountPaid && order?.status && order?.status !== "Unpaid";

  const isDelivered =
    String(order?.status).toLowerCase() === "delivered" || Boolean(order?.delivered);

  const isCancellable =
    order?.status &&
    order.status !== "Unpaid" &&
    !isDelivered &&
    String(order.status).toLowerCase() !== "cancelled";

  function handleCancel() {
    if (!isCancellable) return;
    const ok = window.confirm("Are you sure you want to cancel this order?");
    if (!ok) return;
    setOrder((prev) => ({
      ...prev,
      status: "Cancelled",
      cancelledAt: new Date().toISOString(),
    }));
  }

  return (
  <div className="max-w-3xl mx-auto mt-6 p-6  rounded-lg shadow-sm font-sans text-[#001f3f] ">
    
    <h2 className="text-xl text-center mt-[5%] font-semibold mb-4">Order Details</h2>

    <div className="space-y-6 bg-[#FAF9F6] w-[70%] border-color-[#001f3f] ml-[10%] " style={{border:"2px solid #001f3f", padding:"2%", borderRadius:"8px"}}>
      {/* Cart Items */}
      {order.cartItems?.map((item, i) => (
        <div key={i} className="grid grid-cols-[120px_1fr] gap-[2%] mb-[5%] items-start p-3 rounded-md">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-contain"
          />
          <div className="space-y-2 ">
            <p className="text-[#001f3f] " style={{fontSize:"1.3rem", fontWeight:500}}>{item.name}</p>
            
            <p className="text-[#001f3f] font-medium"style={{fontSize:"1.3rem", fontWeight:500}}>₹{item.price}</p>
            

            <div className="grid grid-cols-6 justify-center text-center items-center rounded-md p-1 " style={{ fontWeight:450}}> 
            <p className="text-sm text-gray-500">Qty: {item.qty} | Size: {item.size}</p>
            <p>Amount Paid: ₹ {order.amountPaid ?? 0.00} </p>
            <p>Payment Method: {order.paymentMethod} </p>
            <p>Order Placed: {order.placedAt} </p>
            </div>
          </div>
        </div>
      ))}

      
         {/* <div>
          <span className="text-gray-500 text-sm ">Order ID:</span>
          <span className="text-gray-900 text-base ">{order._id}</span>
        </div>*/}

     

      
      
       {/*  <button
          type="button"
          onClick={handleCancel}
          disabled={!isCancellable}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            isCancellable
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Cancel Order
        </button>*/}
        <div className="flex gap-3 mt-4 justify-end">
        <PrimaryButton type="button"
          onClick={() => setTrackingOpen(true)}
          className="px-4 py-2 rounded-md text-sm font-medium  text-blue-600 bg-white hover:bg-blue-50 transition ">
          
        
          
          Track Order
          </PrimaryButton>
        
      </div>

      {/* Tracking Modal */}
      {trackingOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 bg-[#ffffff] "
          onClick={() => setTrackingOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-[480px] max-w-[95%]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Tracking for Order {order._id}</h3>
            <p className="text-gray-700">
              Current status:{" "}
              <strong
                className={
                  order.status === "delivered" ? "text-green-600" : "text-blue-600"
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
    expectedDelivery: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    status: PropTypes.string,
    delivered: PropTypes.bool,
    deliveredAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    cancelledAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    trackingHistory: PropTypes.arrayOf(
      PropTypes.shape({
        ts: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        text: PropTypes.string,
      })
    ),
  }),
};

MyOrders.defaultProps = {
  order: {},
};
