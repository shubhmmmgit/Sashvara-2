import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import PrimaryButton from "./PrimaryButton";
import { MdOutlineShoppingCart, MdLocationOn, MdPhone, MdEmail } from "react-icons/md";
import { FaInfoCircle } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import FlashCard from "./Flashcard";
import { IoWalletSharp } from "react-icons/io5";
import { MdPayment } from "react-icons/md";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { FaRegTrashAlt } from "react-icons/fa";

console.log("VITE MODE:", import.meta.env.VITE_RAZORPAY_MODE);
console.log("TEST KEY:", import.meta.env.VITE_RAZORPAY_KEY_ID_TEST);
console.log("LIVE KEY:", import.meta.env.VITE_RAZORPAY_KEY_ID_LIVE);

export default function Checkout() {
  // get setter too
  const { cartItems, setCartItems } = useCart();
  const [formData, setFormData] = useState({
    email: "",
    emailNews: true,
    country: "India",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    state: "Delhi",
    pincode: "",
    phone: "",
    saveInfo: false,
    textNews: false,
    paymentMethod: "",
    discountCode: ""
  });

  const [shippingCost, setShippingCost] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState("");
  const navigate = useNavigate();

  // Hide global header on checkout page and restore on unmount
  useEffect(() => {
    const headerEl = document.querySelector('header');
    const footerEl = document.querySelector("#site-footer");
    const previousDisplay = headerEl ? headerEl.style.display : null;
    const previousFooterDisplay = footerEl ? footerEl.style.display : null;
    if (headerEl) headerEl.style.display = 'none';
    if (footerEl) footerEl.style.display = "none";
    return () => {
      if (headerEl) headerEl.style.display = previousDisplay ?? '';
      if (footerEl) footerEl.style.display = previousFooterDisplay ?? "";
    };
  }, []);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
  const tax = subtotal * 0.0476;

  // NEW: payment-method discount (₹60 off for UPI)
  const paymentMethodDiscount = formData.paymentMethod === 'upi' ? 60 : 0;

  // total now honors subtotal + shipping - coupon discount - payment method discount
  const total = Math.max(0, subtotal + shippingCost - (discountAmount || 0) - paymentMethodDiscount);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleApplyDiscount = () => {
    if (formData.discountCode.toLowerCase() === 'welcome10') {
      setDiscountAmount(subtotal * 0.1);
      setDiscountApplied(true);
    } else if (formData.discountCode.toLowerCase() === 'save20') {
      setDiscountAmount(subtotal * 0.2);
      setDiscountApplied(true);
    } else {
      setDiscountAmount(0);
      setDiscountApplied(false);
    }
  };

  // --- NEW: functions to update cart (same semantics as CartDrawer) ---
  const updateQty = (id, change) => {
    if (!setCartItems) return;
    setCartItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, qty: Math.max(1, (Number(p.qty || 1) + change)) } : p
      )
    );
  };

  const removeItem = (id) => {
    if (!setCartItems) return;
    setCartItems((prev) => prev.filter((p) => p.id !== id));
  };
  // --- end new functions ---

  const handleSubmit = async (e) => {
    console.log("Key ID:", import.meta.env.VITE_RAZORPAY_KEY_ID_TEST);
    e.preventDefault();

    if (cartItems.length === 0) return toast("Cart is empty!", {
      position: "top-center",
      style: {
        background: "#fff",
        color: "#001f3f",
        fontWeight: "500",
        fontSize: "14px",
        border: "1px solid #001f3f",
        borderRadius: "8px",
      },
    });
    if (!formData.paymentMethod) return toast("Please select a payment method.", {
      position: "top-center",
      style: {
        background: "#fff",
        color: "#001f3f",
        fontWeight: "500",
        fontSize: "14px",
        border: "1px solid #001f3f",
        borderRadius: "8px",
      },
    });

    try {
      const orderData = { ...formData, cartItems, total };
      const res = await fetch("https://sashvara-2.onrender.com/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error("Failed to place order");
      const savedOrder = await res.json();
      console.log("Order saved:", savedOrder);

      if (formData.paymentMethod === "upi" || formData.paymentMethod === "partialcod") {
        // For payment flow we use `total` which already accounts for coupon + UPI discount
        const paymentAmount = formData.paymentMethod === "partialcod" ? total * 0.25 : total;
        const { data: razorpayOrder } = await axios.post(
          "https://sashvara-2.onrender.com/api/payment/order",
          { amount: paymentAmount }
        );

        const options = {
          key: import.meta.env.VITE_RAZORPAY_MODE === "test"
              ? import.meta.env.VITE_RAZORPAY_KEY_ID_TEST
              : import.meta.env.VITE_RAZORPAY_KEY_ID_LIVE,
          amount: razorpayOrder.amount * 100,
          currency: razorpayOrder.currency,
          name: "Sashvara Shop",
          description: "Order Payment",
          order_id: razorpayOrder.id,
          handler: async function (response) {
            try {
              const verifyRes = await axios.post("https://sashvara-2.onrender.com/api/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                localOrderId: savedOrder?._id,
              });

              if (verifyRes.data.status === "success") {
                await axios.put(`https://sashvara-2.onrender.com/api/orders/${savedOrder._id}`, {
                  status: "Paid",
                  amountPaid: paymentAmount,
                  paymentMode: formData.paymentMethod,
                  placedAt: new Date(),
                  expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                  trackingHistory: [{ ts: new Date(), text: "Order placed & payment confirmed" }]
                });
                toast.success("Payment verified & order confirmed!", {
                  position: "top-center",
                  style: {
                    background: "#fff",
                    color: "#001f3f",
                    fontWeight: "500",
                    fontSize: "14px",
                    border: "1px solid #001f3f",
                    borderRadius: "8px",
                  }
                });
                setShowFlash(true);
                navigate("/");
              } else {
                toast.error(" Payment verification failed.", {
                  position: "top-center",
                  style: {
                    background: "#fff",
                    color: "#001f3f",
                    fontWeight: "500",
                    fontSize: "14px",
                    border: "1px solid #001f3f",
                    borderRadius: "8px",
                  }
                });
              }
            } catch (err) {
              console.error("Verification error:", err);
              toast.error("Error verifying payment", {
                position: "top-center",
                style: {
                  background: "#fff",
                  color: "#001f3f",
                  fontWeight: "500",
                  fontSize: "14px",
                  border: "1px solid #001f3f",
                  borderRadius: "8px",
                }
              });
            }
          },
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            contact: formData.phone,
          },
          theme: { color: "#001f3f" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.success("Order placed successfully. Payment will be collected on delivery.", {
          position: "top-center",
          style: {
            background: "#fff",
            color: "#001f3f",
            fontWeight: "500",
            fontSize: "14px",
            border: "1px solid #001f3f",
            borderRadius: "8px",
          }
        });
        setShowFlash(true);
      }
    } catch (err) {
      console.error("Checkout error:", err.message);
      toast.error(`Failed to complete order: ${err.message}`, {
        position: "top-center",
        style: {
          background: "#fff",
          color: "#001f3f",
          fontWeight: "500",
          fontSize: "14px",
          border: "1px solid #001f3f",
          borderRadius: "8px",
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 bg-[#EBEBEB]">
      {showFlash && (
        <FlashCard
          message="Thank you ! VISIT SASHVARA AGAIN!"
          imageUrl="../images/LOGO.jpg"
          onClose={() => setShowFlash(false)}
          duration={3000}
        />
      )}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-start mb-4">

</div>

<h1 className="text-3xl text-center font-bold text-[#001f3f] border-b-1 bg-[#ffffff] border-[#808080] "> 
    <button
    type="button"
    onClick={() => navigate(-1)}
    className="text-sm px-3 py-2 flex justify-center rounded hover:bg-gray-100 border border-gray-200 text-[#ffffff] bg-[#001f3f] "
    aria-label="Go back"
  >
    ← Back
  </button>Checkout </h1>
          
        <div id="checkout-page" className="grid grid-cols-2 lg:grid-cols-2 ">
          {/* Left Column - Forms */}
          <div className="space-y-8  w-[70%] ml-[30%]  ">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Section */}
              <div id="contact-detail" className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-medium text-[#001f3f] mb-4 ">Contact</h2>
                <div className="space-y-4">
                  <div>
                    <label id="email-input" htmlFor="email" className="block text-sm font-medium text-gray-700 ">
                      Email or mobile phone number
                    </label>
                    <input
                      type="text"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="contact-input border w-[70%] focus:outline-none focus:ring-2 focus:ring-[#27ADF5]   "
                      style={{ borderRadius: "5px", minHeight: "50px" }}
                      placeholder="Enter email or phone number"
                      required
                    />
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="emailNews"
                          checked={formData.emailNews}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        <span className="email-checkbox text-sm text-gray-600">Email me with news and offers</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Section */}
              <div id="delivery" className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-[#001f3f] " >Delivery</h2>
                <div className="space-y-4  ">
                  <div>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="border w-[71%] mb-[3%] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5]"
                      style={{ borderRadius: "5px", minHeight: "50px" }  }
                    >
                      <option value="India">India</option>
                    </select>
                  </div>

                  {/* Name Fields */}
                  <div id="name-field" className="flex flex-cols-2 gap-[10%] ">
                    <div>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className=" w-[130%]  border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] "
                        style={{ borderRadius: "5px", minHeight: "50px" }}
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className=" w-[125%] border mb-[10%]  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                        style={{ borderRadius: "5px", minHeight: "50px" }}
                        required
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-[70%] mb-[3%]  border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                        style={{ borderRadius: "5px", minHeight: "50px" }}
                        placeholder="Enter your address"
                        required
                      />
                    </div>
                  </div>

                  {/* Apartment */}
                  <div>
                    <input
                      type="text"
                      id="apartment"
                      name="apartment"
                      placeholder=" Apartment, suite, etc. (optional)"
                      value={formData.apartment}
                      onChange={handleInputChange}
                      className="w-[70%] mb-[3%] border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                      style={{ borderRadius: "5px", minHeight: "50px" }}
                    />
                  </div>

                  {/* City, State, Pincode */}
                  <div id="whereabouts" className="flex flex-cols-3 gap-[3%] mb-[3%]">
                    <div>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full  border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                        style={{ borderRadius: "5px", minHeight: "50px" }}
                        required
                      />
                    </div>
                    <div>
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                        style={{ borderRadius: "5px", minHeight: "55px" }}
                      >
                        <option value="Delhi">Delhi</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Kolkata">Kolkata</option> 
                        <option value="Hyderabad">Hyderabad</option>
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        placeholder="PIN code"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="w-[93%]  border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                        style={{ borderRadius: "5px", minHeight: "50px" }}
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <div className="relative">
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        placeholder="Phone "
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-[70%] border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                        style={{ borderRadius: "5px", minHeight: "35px" }}
                        required
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="payment text-xl font-semibold text-[#001f3f] mb-4">Payment</h2>
                <p id="payment-line" className="text-sm text-gray-600 mb-4">All transactions are secure and encrypted.</p>

                <div className="space-y-4">
                  <div>
                    <label id="payment-method" className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <p id="off" className="text-[#000000] "> Extra 5-10% off on UPI </p>
                    <div className="space-y-2">
                      <label id="payment-upi" className="flex items-center w-[70%] p-3 border text-[#808080] border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer " style={{ borderRadius: "5px", minHeight: "35px", fontWeight: 550 }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="upi"
                          onChange={handleInputChange}
                          className="peer hidden"
                        />
                        <span  className="peer-checked:text-[#001f3f]">  <MdPayment className="text-[#000000]" /> Razorpay Secure (UPI, Cards, Wallets, NetBanking) </span>
                      </label>
                      <label id="payment-cod" className="flex items-center w-[70%] p-3 text-[#808080] border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer " style={{ borderRadius: "5px", minHeight: "35px", fontWeight: 550 }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          onChange={handleInputChange}
                          className="peer hidden"
                        />
                        <span className="peer-checked:text-[#001f3f]"> <IoWalletSharp className="text-[#000000]" />  Cash on Delivery</span>
                      </label>
                      <label id="payment-partial" className="flex items-center w-[70%] p-3 text-[#808080]  border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer peer-checked:border-[#001f3f]" style={{ borderRadius: "5px", minHeight: "35px", fontWeight: 550 }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="partialcod"
                          onChange={handleInputChange}
                          className="peer hidden"
                        />
                        <span className="peer-checked:text-[#001f3f]"> <RiMoneyRupeeCircleLine className="text-[#000000]" />Partial COD (Pay 25% )</span>
                      </label>

                      <PrimaryButton
                        onClick={handleSubmit}
                        className="w-[70%] mt-6 py-3 text-lg mt-[5%] "
                      >
                        PAY NOW
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div id="orderSummary" className="lg:sticky lg:top-8 h-full w-full  ">
            <div className=" rounded-lg shadow-sm p-6 mr-[25%] h-[100%] ">
              <h2 className="text-xl font-semibold text-[#001f3f]  ">Order Summary</h2>

              {/* Cart Items with working qty + remove */}
              <div className="space-y-4 mb-6">
                {cartItems.map((item, index) => (
                  <div key={item.id ?? index} className="flex items-center space-x-3 ml-[2%] ">
                    <div className="relative">
                      <img
                        src={item.image || "/placeholder-product.jpg"}
                        alt={item.name}
                        className={`thumb-box relative w-20 h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200`}
                      />
                    </div>

                    <div className="flex-1 ml-[5%]">
                      <h3 className="font-medium text-[#001f3f]">{item.name}</h3>
                      <p className="text-sm text-[#808080]">Size: {item.size ?? item.selectedSize ?? item.variant?.size ?? 'One Size'}</p>
                      <p className="text-sm font-semibold text-gray">₹{(item.price || 0).toLocaleString()}</p>

                      <div className= "size-container ml-[32%]">
                        <div className="size-box ">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="px-2 py-1 border rounded"
                          aria-label="Decrease quantity"
                        >-</button>

                        <span className="px-2">{item.qty ?? 1}</span>

                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="px-2 py-1 border rounded"
                          aria-label="Increase quantity"
                        >+</button>
                       </div>
                        <FaRegTrashAlt onClick={() => removeItem(item.id)} className="text-sm px-2 py-1 cursor-pointer" />
                      </div>
                    </div>

                    <div className="ml-auto">
                     
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount Code */}
              <div className="mb-6">
                <label id="discount" htmlFor="discountCode" className="block text-sm font-medium text-gray-700 mb-1 ml-[2%]">
                  Discount code or gift card
                </label>
                <div id="discountField" className="flex space-x-2 mb-[3%] ml-[2%] ">
                  <input
                    type="text"
                    id="discountCode"
                    name="discountCode"
                    value={formData.discountCode}
                    onChange={handleInputChange}
                    className="w-[40%] border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                    style={{ borderRadius: "5px", minHeight: "35px" }}
                    placeholder="Enter discount code"
                  />
                  <PrimaryButton
                    type="button"
                    id="applyButton"
                    onClick={handleApplyDiscount}
                    className="px-4 py-2 ml-[2%]"
                  >
                    Apply
                  </PrimaryButton>
                </div>
                {discountApplied && (
                  <p className="text-sm text-green-600 ml-[2%] ">Discount applied!</p>
                )}
              </div>

              {/* Order Totals */}
              <div className="pt-4">
                <div className="flex justify-start gap-[45%] ml-[2%]">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-start ml-[2%]">
                  <span className="text-gray-600 flex items-center">Shipping</span>
                  <span className="font-medium text-[82%] text-[#808080]">
                    {shippingCost === 0 ? "" : `₹${shippingCost.toLocaleString()}`}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 ml-[2%]">
                    <span>Coupon Discount</span>
                    <span className="text-center">-₹{Math.round(discountAmount).toLocaleString()}</span>
                  </div>
                )}

                {/* Show UPI discount if selected */}
                {paymentMethodDiscount > 0 && (
                  <div className="flex justify-between text-green-600 ml-[2%]">
                    <span>UPI Discount</span>
                    <span className="text-center">-₹{paymentMethodDiscount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-start text-lg font-bold pt-2 gap-[40%] ml-[2%]">
                  <span>Total</span>
                  <span className="ml-[2%]" style={{ fontSize: "1.25rem" }}>INR ₹{total.toLocaleString()}</span>
                </div>

                <p className="text-sm text-[#808080] ml-[2%]">
                  Including ₹{tax.toFixed(2)} in taxes
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
