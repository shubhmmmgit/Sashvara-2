import React, { useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import PrimaryButton from "./PrimaryButton";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import FlashCard from "./Flashcard";
import { MdOutlineShoppingCart } from "react-icons/md";
import { IoWalletSharp } from "react-icons/io5";
import { MdPayment } from "react-icons/md";

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

  // ---------- localStorage helpers ----------
  const CART_KEY = "cartItems";
  const FORM_KEY = "checkoutForm";
  const saveCartRef = useRef(null);
  const saveFormRef = useRef(null);

  function safeParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  // Hydrate formData from localStorage on mount
  useEffect(() => {
    try {
      const savedForm = safeParse(localStorage.getItem(FORM_KEY), null);
      if (savedForm && typeof savedForm === "object") {
        // merge saved form over defaults (so new fields get defaults)
        setFormData(prev => ({ ...prev, ...savedForm }));
      }
    } catch (err) {
      console.warn("Failed to load checkout form from localStorage", err);
    }
  }, []);

  // Hydrate cart from localStorage if cartItems is empty on mount
  useEffect(() => {
    try {
      if ((!cartItems || cartItems.length === 0) && typeof localStorage !== "undefined") {
        const savedCart = safeParse(localStorage.getItem(CART_KEY), null);
        if (Array.isArray(savedCart) && savedCart.length) {
          // ensure numeric qty
          setCartItems(savedCart.map(it => ({ ...it, qty: Number(it.qty) || 1 })));
        }
      }
    } catch (err) {
      console.warn("Failed to load cart from localStorage", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCartItems]);

  // Persist formData to localStorage (debounced)
  useEffect(() => {
    clearTimeout(saveFormRef.current);
    saveFormRef.current = setTimeout(() => {
      try {
        localStorage.setItem(FORM_KEY, JSON.stringify(formData));
      } catch (err) {
        console.warn("Failed to save checkout form to localStorage", err);
      }
    }, 200);
    return () => clearTimeout(saveFormRef.current);
  }, [formData]);

  // Persist cartItems to localStorage (debounced)
  useEffect(() => {
    clearTimeout(saveCartRef.current);
    saveCartRef.current = setTimeout(() => {
      try {
        if (Array.isArray(cartItems) && cartItems.length > 0) {
          localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
        } else {
          localStorage.removeItem(CART_KEY);
        }
      } catch (err) {
        console.warn("Failed to save cart to localStorage", err);
      }
    }, 200);
    return () => clearTimeout(saveCartRef.current);
  }, [cartItems]);

  // Optional: sync across tabs (if cart/form changed elsewhere)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key === FORM_KEY && e.newValue) {
        const parsed = safeParse(e.newValue, null);
        if (parsed) setFormData(prev => ({ ...prev, ...parsed }));
      }
      if (e.key === CART_KEY && e.newValue) {
        const parsed = safeParse(e.newValue, null);
        if (Array.isArray(parsed)) setCartItems(parsed.map(it => ({ ...it, qty: Number(it.qty) || 1 })));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setCartItems]);

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

  // Replace your current handleProceed with this:
  const handleProceed = () => {
    // basic trimmed values
    const v = {
      email: (formData.email || "").trim(),
      firstName: (formData.firstName || "").trim(),
      lastName: (formData.lastName || "").trim(),
      address: (formData.address || "").trim(),
      city: (formData.city || "").trim(),
      pincode: (formData.pincode || "").trim(),
      phone: (formData.phone || "").trim(),
    };

    // simple validation rules
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^\d{10}$/;     // 10 digits
    const pinRe = /^\d{5,6}$/;      // 5 or 6 digits (adjust if you require 6)

    // check required fields in order (so focus goes to first bad field)
    if (!v.email) {
      toast.error("Please enter email or mobile phone number", {position: "top-center"} );
      const el = document.getElementById("email"); if (el) el.focus();
      return;
    }
    // If you accept phone-only in email field, comment out the next email format check.
    if (!emailRe.test(v.email) && !phoneRe.test(v.email)) {
      // allow either a valid email OR a 10-digit phone in the same field
      toast.error("Enter a valid email or 10-digit phone number" , {position: "top-center"} );
      const el = document.getElementById("email"); if (el) el.focus();
      return;
    }

    if (!v.firstName) {
      toast.error("Please enter first name" , {position: "top-center"} );
      const el = document.getElementById("firstName"); if (el) el.focus();
      return;
    }
    if (!v.lastName) {
      toast.error("Please enter last name", {position: "top-center"} );
      const el = document.getElementById("lastName"); if (el) el.focus();
      return;
    }
    if (!v.address) {
      toast.error("Please enter address", {position: "top-center"} );
      const el = document.getElementById("address"); if (el) el.focus();
      return;
    }
    if (!v.city) {
      toast.error("Please enter city", {position: "top-center"} );
      const el = document.getElementById("city"); if (el) el.focus();
      return;
    }
    if (!v.pincode) {
      toast.error("Please enter PIN code", {position: "top-center"} );
      const el = document.getElementById("pincode"); if (el) el.focus();
      return;
    }
    if (!pinRe.test(v.pincode)) {
      toast.error("Please enter a valid PIN code", {position: "top-center"} );
      const el = document.getElementById("pincode"); if (el) el.focus();
      return;
    }
    if (!v.phone) {
      toast.error("Please enter phone number", {position: "top-center"} );
      const el = document.getElementById("phone"); if (el) el.focus();
      return;
    }
    if (!phoneRe.test(v.phone)) {
      toast.error("Please enter a valid 10-digit phone number", {position: "top-center"} );
      const el = document.getElementById("phone"); if (el) el.focus();
      return;
    }

    // optional: ensure cart not empty before proceeding
    if (!cartItems || cartItems.length === 0) {
      toast.error("Your cart is empty", {position: "top-center"} );
      return;
    }

    // all good — persist current form to localStorage (you already do this elsewhere, but safe)
    try { localStorage.setItem(FORM_KEY, JSON.stringify(formData)); } catch (err) {}

    // navigate
    navigate("/checkout/payment", { state: { formData } });
  };

  const handleApplyDiscount = () => {
    if ((formData.discountCode || "").toLowerCase() === 'welcome10') {
      setDiscountAmount(subtotal * 0.1);
      setDiscountApplied(true);
    } else if ((formData.discountCode || "").toLowerCase() === 'save20') {
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
                // Clear persisted cart + form so refresh won't repeat
                try {
                  localStorage.removeItem(CART_KEY);
                  localStorage.removeItem(FORM_KEY);
                } catch (err) {}
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
        // Clear persisted cart + form so refresh won't repeat
        try {
          localStorage.removeItem(CART_KEY);
          localStorage.removeItem(FORM_KEY);
        } catch (err) {}
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
    <div className="checkout-detail">
      
      <div className="">
       
      <h1 className="text-3xl text-center font-bold text-[#001f3f] border-b-1 bg-[#ffffff] border-[#808080] "> 
      <button
      type="button"
      onClick={() => navigate(-1)}
      className="text-sm px-3 py-2 flex justify-center rounded hover:bg-gray-100 border border-gray-200 text-[#ffffff] bg-[#001f3f] "
      aria-label="Go back" >
      ← Back
         </button> <MdOutlineShoppingCart />Checkout </h1>
          
        <div id="checkout-page" className="checkout-inputs flex">
          {/* Left Column - Forms */}
          <div className="flex justify-center w-full">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Section */}
              <div id="contact-detail" className="bg-white  rounded-lg shadow-sm p-6">
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
                      className="contact-input border w-full focus:outline-none focus:ring-2 focus:ring-[#27ADF5]   "
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
                <div className="space-y-[5%] ">
                  <div>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="border w-[101%]  border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5]"
                      style={{ borderRadius: "5px", minHeight: "50px" }  }
                    >
                      <option value="India">India</option>
                    </select>
                  </div>

                  {/* Name Fields */}
                  <div id="name-field" className="flex gap-[20%] ">
                    <div>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className=" w-full  border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] "
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
                        className=" w-[120%] border   rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
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
                        className="w-full   border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
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
                      className="w-full  border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
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
                    <div className="relative w-full">
                    <span className="absolute left-3 top-1/3 flex justify-end ml-[5%] ">
                      <img
                        src="/images/indiaicon.png"   
                        alt="India Map"
                        className="w-[10%] opacity-80"
                     />
                    </span>
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        placeholder="PIN code"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="w-full  border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
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
                        className="w-full border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                        style={{ borderRadius: "5px", minHeight: "50px" }}
                        required
                      />
                    </div>
                  </div>

                </div>
              </div>
              <div className="flex justify-center">
                <PrimaryButton type="button"
                  onClick={handleProceed}
                  className="w-[50%] bg-[#001f3f] text-white py-3 rounded-lg mt-[5%]">Proceed to Payment </PrimaryButton>
              </div>
              <div className="flex justify-center mt-[2%] gap-[2%] ">
                <img
                  src="/images/Visaicon.png"
                  alt="visaicon"
                  className="w-[5%] "
                />
                <img
                  src="/images/UPIicon.png"
                  alt="visaicon"
                  className="w-[5%] "
                />
                <img
                  src="/images/mastercardicon.png"
                  alt="visaicon"
                  className="w-[5%] "
                />
              </div>
            </form>
          </div>

          {/* Right Column - Order Summary */}

        </div>
      </div>
    </div>
  );
}
