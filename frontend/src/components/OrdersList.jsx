import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function OrdersList() {
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

    useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const { data } = await axios.get("https://sashvara-2.onrender.com/api/orders");
        if (!mounted) return;
        setOrders(data || []);
      } catch (err) {
        console.error(err);
        setError("Could not load orders.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <p className="text-center mt-10">Loading orders...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center mt-10">
        <p className="mb-4">You haven't placed any orders yet.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded">
          Shop now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-xl mb-4">My Orders</h2>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li
            key={order._id}
            className="p-3 border rounded flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{order.productName || "Order"}</div>
              <div className="text-sm text-gray-500">{order._id}</div>
              <div
                className={`text-sm font-semibold ${
                  order.status === "Unpaid"
                    ? "text-red-600"
                    : order.status === "Delivered"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {order.status}
              </div>
            </div>

            {/* ✅ Only show "View" if not unpaid */}
            {order.status !== "Unpaid" ? (
              <Link
                to={`/my-order/${order._id}`}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                View
              </Link>
            ) : (
              <Link
                to="/cart"
                className="px-3 py-1 bg-yellow-500 text-white rounded"
              >
                Complete Payment
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
