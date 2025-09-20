// CheckoutPayment.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import PrimaryButton from "./PrimaryButton";
import axios from "axios";
import toast from "react-hot-toast";
import FlashCard from "./Flashcard";
import { MdOutlineShoppingCart } from "react-icons/md";
import { IoWalletSharp } from "react-icons/io5";
import { MdPayment } from "react-icons/md";
import { FaRegTrashAlt } from "react-icons/fa";

console.log("VITE MODE:", import.meta.env.VITE_RAZORPAY_MODE);
console.log("TEST KEY:", import.meta.env.VITE_RAZORPAY_KEY_ID_TEST);
console.log("LIVE KEY:", import.meta.env.VITE_RAZORPAY_KEY_ID_LIVE);

// keys (support versioned + legacy names for compatibility)
const STORAGE_KEY_CART = "sashvara_cart_v1";
const STORAGE_KEY_CART_LEGACY = "cartItems";
const STORAGE_KEY_CHECKOUT = "sashvara_checkout_v1";
const STORAGE_KEY_CHECKOUT_LEGACY = "checkoutForm";

function safeParse(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function CheckoutPayment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, setCartItems } = useCart();

  // Flash settings
  const FLASH_DURATION = 3000; // ms
  const timeoutRef = useRef(null);

  // Load initial form data from location.state first, then storage (versioned), then legacy
  const initialForm = useMemo(() => {
    const fromState = location?.state?.formData;
    if (fromState) return fromState;
    const v = safeParse(localStorage.getItem(STORAGE_KEY_CHECKOUT));
    if (v) return v;
    const legacy = safeParse(localStorage.getItem(STORAGE_KEY_CHECKOUT_LEGACY));
    if (legacy) return legacy;
    // fallback defaults (kept small)
    return {
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
    };
  }, [location]);

  const [formData, setFormData] = useState(initialForm);
  const [shippingCost, setShippingCost] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const saveCartRef = useRef(null);
  const saveFormRef = useRef(null);
  
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

  // Ensure cart is hydrated from storage if context is empty
  useEffect(() => {
    try {
      if ((!cartItems || cartItems.length === 0) && typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY_CART) || localStorage.getItem(STORAGE_KEY_CART_LEGACY);
        const parsed = safeParse(raw, []);
        if (Array.isArray(parsed) && parsed.length) {
          setCartItems(parsed.map(it => ({ ...it, qty: Number(it.qty) || 1 })));
        }
      }
    } catch (err) {
      console.warn("Failed to hydrate cart in payment page:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCartItems]);

  // Persist formData (so refresh on payment page keeps it)
  useEffect(() => {
    clearTimeout(saveFormRef.current);
    saveFormRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_CHECKOUT, JSON.stringify(formData));
        localStorage.setItem(STORAGE_KEY_CHECKOUT_LEGACY, JSON.stringify(formData));
      } catch (e) { /* ignore */ }
    }, 200);
    return () => clearTimeout(saveFormRef.current);
  }, [formData]);

  // Persist cart (defensive; if CartContext already does this it's ok)
  useEffect(() => {
    clearTimeout(saveCartRef.current);
    saveCartRef.current = setTimeout(() => {
      try {
        if (Array.isArray(cartItems) && cartItems.length) {
          localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cartItems));
          localStorage.setItem(STORAGE_KEY_CART_LEGACY, JSON.stringify(cartItems));
          localStorage.setItem("sashvara_cart_ts_v1", String(Date.now()));
        } else {
          localStorage.removeItem(STORAGE_KEY_CART);
          localStorage.removeItem(STORAGE_KEY_CART_LEGACY);
        }
      } catch (e) { /* ignore */ }
    }, 200);
    return () => clearTimeout(saveCartRef.current);
  }, [cartItems]);

  // Recompute totals & discounts
  const subtotal = (cartItems || []).reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
  const tax = subtotal * 0.0476;
  const paymentMethodDiscount = formData.paymentMethod === "upi" ? 30 : 0;

  // compute discount amount from discountCode in formData
  useEffect(() => {
    const code = (formData.discountCode || "").toLowerCase();
    if (code === "welcome10") {
      setDiscountAmount(subtotal * 0.1);
    } else if (code === "save20") {
      setDiscountAmount(subtotal * 0.2);
    } else {
      setDiscountAmount(0);
    }
  }, [formData.discountCode, subtotal]);

  const total = Math.max(0, subtotal + shippingCost - (discountAmount || 0) + paymentMethodDiscount);

  // Keep form changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    // === ADDED: update shippingCost when paymentMethod radio changes ===
    if (name === "paymentMethod") {
      // value will be one of: "upi", "cod", "partialcod" (matching your inputs)
      let newShipping = 0;
      if (value === "upi") {
        newShipping = 30;     // add ₹30 for UPI (Razorpay)
      } else if (value === "cod") {
        newShipping = 70;     // add ₹70 for Cash on Delivery
      } else if (value === "partialcod") {
        newShipping = 45;     // add ₹45 for Partial COD
      } else {
        newShipping = 0;
      }
      setShippingCost(newShipping);
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // cart helpers (same semantics as your Checkout / Drawer)
  const updateQty = (id, change) => {
    if (!setCartItems) return;
    setCartItems(prev => prev.map(p => p.id === id ? { ...p, qty: Math.max(1, (Number(p.qty || 1) + change)) } : p));
  };
  const removeItem = (id) => {
    if (!setCartItems) return;
    setCartItems(prev => prev.filter(p => p.id !== id));
  };

  // Clear persisted storage after success
  async function clearOnSuccess() {
    try {
      localStorage.removeItem(STORAGE_KEY_CART);
      localStorage.removeItem(STORAGE_KEY_CART_LEGACY);
      localStorage.removeItem(STORAGE_KEY_CHECKOUT);
      localStorage.removeItem(STORAGE_KEY_CHECKOUT_LEGACY);
      localStorage.removeItem("sashvara_checkout_stage");
      localStorage.removeItem("sashvara_cart_ts");
      setCartItems([]);
    } catch (e) {
      console.warn("clearOnSuccess failed:", e);
    }
  }

  // helper to show flash and then navigate
  const showThankYouAndGoHome = async () => {
    // show flash immediately
    setShowFlash(true);
    // ensure storage cleared
    await clearOnSuccess();
    // schedule navigation after FLASH_DURATION
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowFlash(false);
      navigate("/");
    }, FLASH_DURATION);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cartItems || cartItems.length === 0) {
      return toast("Cart is empty!", { position: "top-center", style: { background: "#fff", color: "#001f3f", fontWeight: "500", fontSize: "14px", border: "1px solid #001f3f", borderRadius: "8px" } });
    }
    if (!formData.paymentMethod) {
      return toast("Please select a payment method.", { position: "top-center", style: { background: "#fff", color: "#001f3f", fontWeight: "500", fontSize: "14px", border: "1px solid #001f3f", borderRadius: "8px" } });
    }

    try {
      const orderPayload = {
        email: formData.email,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country || "India",
        paymentMethod: formData.paymentMethod,
        cartItems: (cartItems || []).map(item => ({
          name: item.product_name || item.name,
          price: item.price,
          qty: item.qty,
          size: item.size,
          image: item.image
        })),
        total
      };

      const res = await fetch("https://sashvara-2.onrender.com/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const resText = await res.text().catch(() => "");

      if (!res.ok) {
        console.error("Order API error:", res.status, resText);
        toast.error(`Failed to place order: ${resText ? resText.slice(0, 180) : res.status}`, { position: "top-center" });
        throw new Error(resText || `status ${res.status}`);
      }

      let savedOrder = null;
      try { savedOrder = resText ? JSON.parse(resText) : null; } catch (err) { /* ignore */ }

      // If payment required (UPI / partial)
      if (formData.paymentMethod === "upi" || formData.paymentMethod === "partialcod") {
        const paymentAmount = formData.paymentMethod === "partialcod" ? total * 0.25 : total;
        const { data: razorpayOrder } = await axios.post("https://sashvara-2.onrender.com/api/payment/order", { amount: paymentAmount });

        const options = {
          key: import.meta.env.VITE_RAZORPAY_MODE === "test" ? import.meta.env.VITE_RAZORPAY_KEY_ID_TEST : import.meta.env.VITE_RAZORPAY_KEY_ID_LIVE,
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
                toast.success("Payment verified & order confirmed!", { position: "top-center" });
                // show flash then navigate home
                await showThankYouAndGoHome();
              } else {
                toast.error("Payment verification failed.", { position: "top-center" });
              }
            } catch (err) {
              console.error("Verification error:", err);
              toast.error("Error verifying payment", { position: "top-center" });
            }
          },
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            contact: formData.phone
          },
          theme: { color: "#001f3f" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // COD
        toast.success("Order placed successfully. Payment will be collected on delivery.", { position: "top-center" });
        setShowFlash(true);
        // clear and show flash then navigate
        await showThankYouAndGoHome();
      }
    } catch (err) {
      console.error("Checkout error:", err?.message || err);
      toast.error(`Failed to complete order: ${err?.message || "Unknown error"}`, { position: "top-center" });
    }
  };

  // simple storage event sync (optional)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key === STORAGE_KEY_CHECKOUT || e.key === STORAGE_KEY_CHECKOUT_LEGACY) {
        const parsed = safeParse(e.newValue, null);
        if (parsed) setFormData(parsed);
      }
      if (e.key === STORAGE_KEY_CART || e.key === STORAGE_KEY_CART_LEGACY) {
        const parsed = safeParse(e.newValue, null);
        if (Array.isArray(parsed)) setCartItems(parsed.map(it => ({ ...it, qty: Number(it.qty) || 1 })));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setCartItems]);

  // cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  // --- UI: kept same classNames & layout as you had ---
  return (
    <div className="paymentCheckout min-h-screen flex justify-center bg-[#fff] py-8">
      {/* FlashCard: shown on success */}
      {showFlash && (
        <FlashCard
          message="Thank you! Visit Sashvara again"
          imageUrl="../images/LOGO.jpg"
          onClose={() => setShowFlash(false)}
          duration={FLASH_DURATION}
        />
      )}

      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm px-3 py-2 flex justify-center rounded hover:bg-gray-100 border border-gray-200 text-[#ffffff] bg-[#001f3f] "
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>
      <div className="Paymentwrapper max-w-5xl mx-auto  gap-8">
        {/* Payment Section */}
        <div id="payment-section" className="bg-white rounded-lg shadow-sm p-6 mt-[15%] ">
          <h2 className="payment text-xl font-semibold text-[#001f3f] mb-4">Payment</h2>
          <p id="payment-line" className="text-sm text-gray-600 mb-4">All transactions are secure and encrypted.</p>

          <div className="">
            <div>
              <label  className="block text-sm font-medium text-gray-700 mb-[10%] ">Payment Method</label>

              <div  className="">
                <div className="payment-label"> <p id="upiTag" className="floating-tag text-[#016B00] ">Save ₹40 + Get Fast Delivery</p>
                  <label id="payment-upi" className="flex items-center  w-full p-3 border text-start text-[#808080] border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer " style={{ borderRadius: "5px", minHeight: "80px", fontWeight: 550 }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={formData.paymentMethod === "upi"}
                      onChange={handleInputChange}
                      className="peer hidden"
                    />
                    <span className="absolute bottom-1/2.5  flex justify-start">
                      <img
                        src="/images/UPIicon.png"
                        alt="India Map"
                        className="w-[50%] opacity-80"
                      />
                    </span>
                    <span id="UpiSpan" className="peer-checked:text-[#001f3f] ml-[12%] flex">  Razorpay Secure (UPI, Cards, Wallets, NetBanking) </span> <p className="mr-[10%] ">₹30</p>
                  </label>
                </div>

                <div className="payment-label"> <p id="codTag" className="floating-tag text-[#FF2B00]">₹70 Extra Handling Fee Applies</p>
                  <label id="payment-cod" className="flex items-center w-full p-3 text-[#808080] border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer " style={{ borderRadius: "5px", minHeight: "80px", fontWeight: 550 }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === "cod"}
                      onChange={handleInputChange}
                      className="peer hidden"
                    />
                    <span className="absolute bottom-1/2.5  flex justify-start ml-[2%] ">
                      <img
                        src="/images/moneyicon.png"
                        alt="India Map"
                        className="w-[20%] opacity-80"
                      />
                    </span>
                    <span id="codSpan" className="peer-checked:text-[#001f3f] ml-[15%]">  Cash on Delivery</span><p className="ml-[40%] ">₹70</p>
                  </label>
                </div>

                <div className="payment-label"> <p id="partialTag" className="floating-tag text-[#808080]"> Pay 25% Now, Rest at Delivery</p>
                  <label id="payment-partial" className="flex items-center w-full p-3 text-[#808080]  border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer peer-checked:border-[#001f3f]" style={{ borderRadius: "5px", minHeight: "80px", fontWeight: 550 }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="partialcod"
                      checked={formData.paymentMethod === "partialcod"}
                      onChange={handleInputChange}
                      className="peer hidden"
                    />

                    <span className="absolute bottom-1/2.5  flex justify-start ml-[2%] ">
                      <img
                        src="/images/partialicon.png"
                        alt="India Map"
                        className="w-[10%] opacity-80"
                      />
                    </span>
                    <span id="partialSpan" className="peer-checked:text-[#001f3f] ml-[15%]"> Partial COD (Pay 25%) </span> <p className="ml-[32%] ">₹45</p>
                  </label>

                </div>

                <div id="PaynowButton" className="flex justify-center">
                  <PrimaryButton
                    onClick={handleSubmit}
                    className="w-[70%] mt-6 py-3 text-lg mt-[5%] ml-[10%] "
                  >
                    PAY NOW
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="orderSummary" className="lg:sticky lg:top-8 h-full w-full  ">
          <div id="orderSummaryWrap" className=" rounded-lg shadow-sm p-6 h-full ">
            <h2 id="Summarytag" className="text-xl font-semibold text-[#001f3f]">Order Summary</h2>

            {/* Cart Items with working qty + remove */}
            <div className="space-y-4 mb-6">
              {cartItems.map((item, index) => (
                <div key={item.id ?? index} className="cartDetails flex items-center space-x-3 ml-[2%] ">
                  <div id="cartImage" className="relative">
                    <img
                      src={item.image || "/placeholder-product.jpg"}
                      alt={item.name}
                      className={`thumb-box relative w-20 h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200`}
                    />
                  </div>

                  <div className="flex-1 ml-[5%]">
                    <h3 id="cartName" className="font-medium text-[#001f3f]">{item.name}</h3>
                    <p className="text-sm text-[#808080]">Size: {item.size ?? item.selectedSize ?? item.variant?.size ?? 'One Size'}</p>
                    <p className="text-sm font-semibold text-gray">₹{(item.price || 0).toLocaleString()}</p>

                    <div className="size-container ml-[32%]">
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
            <div className="mb-6 space-y-[5%]">
              <label id="discountlabel" htmlFor="discountCode" className="block text-sm font-medium text-gray-700 mb-1 ml-[2%]">
                Discount code or gift card
              </label>
              <div id="discountField" className="flex gap-[5%] mb-[3%] ml-[2%] ">
                <input
                  type="text"
                  id="discountCode"
                  name="discountCode"
                  value={formData.discountCode}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                  style={{ borderRadius: "5px", minHeight: "35px" }}
                  placeholder="Enter discount code"
                />
                <PrimaryButton
                  type="button"
                  id="applyButton"
                  onClick={() => {
                    // apply logic handled by effect above
                    if (!formData.discountCode) return toast("Enter a code first", { position: "top-center" });
                    toast("Applied", { position: "top-center" });
                  }}
                  className="px-4 py-2 ml-[2%]"
                >
                  Apply
                </PrimaryButton>
              </div>
            </div>

            {/* Order Totals */}
            <div className="pt-4">
              <div id="subtotalWrap" className="flex justify-start gap-[45%] ml-[2%]">
                <span id="Subtotalspan" className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>

              <div id="shippingWrap" className="flex justify-start ml-[2%] gap-[45%] ">
                <span className="text-gray-600 flex items-center">Shipping</span>
                <span className="font-medium text-[90%] text-[#000000]">
                  {shippingCost === 0 ? "" : `₹${shippingCost.toLocaleString()}`}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 ml-[2%]">
                  <span>Coupon Discount</span>
                  <span className="text-center">-₹{Math.round(discountAmount).toLocaleString()}</span>
                </div>
              )}

             

              <div id="totalWrap" className="flex justify-start text-lg font-bold pt-2 gap-[40%] ml-[2%]">
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
  );
}
