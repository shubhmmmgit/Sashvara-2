// src/pages/ShippingPolicy.jsx
import React from "react";

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 text-center mt-[10%] ">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-[#001f3f] mb-6">Shipping Policy</h1>
        <p className="text-gray-700 mb-4">
          Orders dispatch within 3–7 working days.
        </p>
        <p className="text-gray-700 mb-4">
          Delivery usually takes 2-7 days, depending on location.
        </p>
        <p className="text-gray-700">
          Tracking details will be shared once shipped.
        </p>
      </div>
    </div>
  );
}
