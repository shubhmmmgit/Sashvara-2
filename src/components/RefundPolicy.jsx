// src/pages/RefundPolicy.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center px-4  w-[80%] ml-[10%] ">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-[#001f3f]  text-center mb-6">Refund & Exchange Policy</h1>

        <p className="mb-4 text-center">
          We're committed to keeping your shopping experience smooth, secure, and stylish. 
          Please read our policies before placing an order.
        </p>

        <h2 className="text-2xl font-semibold text-[#001f3f] mt-6 mb-2">Return Policy</h2>
        <p className="mb-2">
          We have a 7-days return policy, which means you have 7 days after receiving your item to request a return.
        </p>
        <p className="mb-2">
          To be eligible for a return, your item must be in the same condition that you received it, unworn or unused, with tags, and in its original packaging. You’ll also need the receipt or proof of purchase.
        </p>
        <p className="mb-4">
          To start a return, contact us at <a href="mailto:teamsashvara@gmail.com" className="text-blue-600 underline">teamsashvara@gmail.com</a>.
        </p>

        <h2 className="text-2xl font-semibold text-[#001f3f] mt-6 mb-2">Damages and Issues</h2>
        <p className="mb-4">
          Please inspect your order upon reception and contact us immediately if the item is defective, damaged, or if you receive the wrong item, so that we can evaluate the issue and make it right.
        </p>

        <h2 className="text-2xl font-semibold text-[#001f3f] mt-6 mb-2">Exchanges</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Exchanges accepted within 7 days of delivery. Send an email with pictures of the item and your ORDER ID.</li>
          <li>If approved, you will receive an approval email and a scheduled pickup within 3 days with a payment link.</li>
          <li>Items must be unused, unwashed, and in original condition with tags.</li>
          <li>One-time size exchange allowed, subject to availability, with a small charge of ₹150.</li>
          <li>If wrong color/size is sent from our end, there’s no upfront payment.</li>
          <li>To initiate an exchange, pay the reverse pickup charge in advance via UPI or payment link.</li>
          <li>Sale/discounted/custom pieces are non-returnable.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-[#001f3f] mt-6 mb-2">Refunds</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Refunds are offered only if you receive a damaged, defective, or wrong item.</li>
          <li>Refunds are processed within 5–7 working days after approval.</li>
          <li>A reverse pickup charge will be deducted from your refund or store credit.</li>
          <li>Refunds are processed manually via UPI within 2-5 business days. Payment gateway fee + pickup charge will be deducted.</li>
          <li>All other return cases are eligible for store credit only.</li>
          <li>We will notify you once we’ve received and inspected your return. Approved refunds will be refunded to the original payment method within 10 business days.</li>
          <li>If more than 15 business days have passed since approval, contact <a href="mailto:teamsashvara@gmail.com" className="text-blue-600 underline">teamsashvara@gmail.com</a>.</li>
        </ul>

        <div className="mt-6">
          <Link to="/" className="text-blue-600 no-underline">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
