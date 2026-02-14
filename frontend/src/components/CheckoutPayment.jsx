import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import PrimaryButton from "./PrimaryButton";
import axios from "axios";
import toast from "react-hot-toast";
import FlashCard from "./Flashcard";
import { FaRegTrashAlt } from "react-icons/fa";
import { imageUrl } from "../utils/imageUrl";



const STORAGE_KEY_CART = "sashvara_cart_v1";
const STORAGE_KEY_CHECKOUT = "sashvara_checkout_v1";
const STORAGE_KEY_CHECKOUT_LEGACY = "checkoutForm";
const CHECKOUT_SESSION_KEY = "checkoutSessionId";

function safeParse(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function CheckoutPayment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, setCartItems } = useCart();

  const FLASH_DURATION = 3000;
  const timeoutRef = useRef(null);

  const initialForm = useMemo(() => {
    const fromState = location?.state?.formData;
    if (fromState) return fromState;
    const v = safeParse(localStorage.getItem(STORAGE_KEY_CHECKOUT));
    if (v) return v;
    const legacy = safeParse(localStorage.getItem(STORAGE_KEY_CHECKOUT_LEGACY));
    if (legacy) return legacy;
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
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applying, setApplying] = useState(false);
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

  // hydrate cart from localStorage if needed
  useEffect(() => {
    try {
      if ((!cartItems || cartItems.length === 0) && typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY_CART) || localStorage.getItem("cartItems");
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

  useEffect(() => {
    clearTimeout(saveCartRef.current);
    saveCartRef.current = setTimeout(() => {
      try {
        if (Array.isArray(cartItems) && cartItems.length) {
          localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cartItems));
          localStorage.setItem("cartItems", JSON.stringify(cartItems));
          localStorage.setItem("sashvara_cart_ts_v1", String(Date.now()));
        } else {
          localStorage.removeItem(STORAGE_KEY_CART);
          localStorage.removeItem("cartItems");
        }
      } catch (e) { /* ignore */ }
    }, 200);
    return () => clearTimeout(saveCartRef.current);
  }, [cartItems]);

  useEffect(() => {
    const sid = location?.state?.sessionId;
    if (sid) localStorage.setItem(CHECKOUT_SESSION_KEY, sid);
  }, [location]);

  const subtotal = (cartItems || []).reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
  const tax = subtotal * 0.0476;

 {/* useEffect(() => {
  const code = (formData.discountCode || "").toLowerCase();
  if (code === " ") {
    return;
  }

  if (code === "welcome10") {
    setDiscountAmount(subtotal * 0.1);
  } else if (code === "save20") {
    setDiscountAmount(subtotal * 0.2);
  } else {
    setDiscountAmount(0);
  }
}, [formData.discountCode, subtotal]);
 */}

  
const totalpayupi = Math.max(0, subtotal + 50 - (discountAmount || 0));
const totalpaycod = Math.max(0, subtotal + 70 - (discountAmount || 0));
const totalpayPartial = Math.max(
  0,
  subtotal * 0.25 + 100 - (discountAmount || 0)
);

  const total =
  formData.paymentMethod === "upi"
    ? totalpayupi
    : formData.paymentMethod === "partialcod"
    ? totalpayPartial
    : formData.paymentMethod === "cod"
    ? totalpaycod
    : Math.max(0, subtotal - (discountAmount || 0));

  const handleInputChange = (e) => {
  const { name, value, type, checked } = e.target;

  // handle payment method changes
  if (name === "paymentMethod") {
    let newShipping = 0;
    if (value === "upi") newShipping = 50;
    else if (value === "cod") newShipping = 100;
    else if (value === "partialcod") newShipping = 100;
    setShippingCost(newShipping);

    // Clear coupon if switching away from UPI
    if (value !== "upi" && appliedCoupon?.code === "LETSTRYIT") {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setFormData(prev => ({ ...prev, discountCode: "" }));
      toast("Coupon removed (valid only for UPI)", { position: "top-center" });
    }
  }

  // handle coupon code changes
  if (name === "discountCode") {
    setFormData(prev => ({ ...prev, [name]: value }));
    // if user changed the code after applying, clear the applied coupon so they must re-apply
    if (appliedCoupon && appliedCoupon.code !== (value || "").toUpperCase()) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
    }
    return;
  }

  // generic update for all other fields
  setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
};

  const updateQty = (id, change) => {
    if (!setCartItems) return;
    setCartItems(prev => prev.map(p => p.id === id ? { ...p, qty: Math.max(1, (Number(p.qty || 1) + change)) } : p));
  };
  const removeItem = (id) => {
    if (!setCartItems) return;
    setCartItems(prev => prev.filter(p => p.id !== id));
  };

  async function clearOnSuccess() {
    try {
      localStorage.removeItem(STORAGE_KEY_CART);
      localStorage.removeItem("cartItems");
      localStorage.removeItem(STORAGE_KEY_CHECKOUT);
      localStorage.removeItem(STORAGE_KEY_CHECKOUT_LEGACY);
      localStorage.removeItem("sashvara_checkout_stage");
      localStorage.removeItem("sashvara_cart_ts");
      setCartItems([]);
    } catch (e) { console.warn("clearOnSuccess failed:", e); }
  }

  const showThankYouAndGoHome = async () => {
    if (appliedCoupon?.code === "LETSTRYIT") {
    localStorage.setItem("letstryit_used_v1", "true");
  }

  setShowFlash(true);
  await clearOnSuccess();

  clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => {
    setShowFlash(false);
    navigate("/");
  }, FLASH_DURATION);
}

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!cartItems || cartItems.length === 0) {
    return toast("Cart is empty!", { position: "top-center" });
  }
  if (!formData.paymentMethod) {
    return toast("Please select a payment method.", { position: "top-center" });
  }

  try {
    // 1️⃣ Ensure checkout session exists
    let sessionId = localStorage.getItem("checkoutSessionId");
    try {
      if (sessionId) {
        await axios.put(
          `https://sashvara-2.onrender.com/api/checkouts/${sessionId}`,
          { paymentStatus: "pending" }
        );
      } else {
        const res = await axios.post(
          "https://sashvara-2.onrender.com/api/checkouts",
          { userData: formData, items: cartItems, paymentStatus: "pending" }
        );
        sessionId = res?.data?.session?._id || res?.data?.session?.sessionId;
        if (sessionId) localStorage.setItem("checkoutSessionId", sessionId);
      }
    } catch (err) {
      console.warn("Could not create/update checkout session (non-fatal)", err);
    }

    const isClientOnlyCoupon = appliedCoupon?.code === "LETSTRYIT";

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
      total,
      discount: discountAmount,
      couponCode: isClientOnlyCoupon ? null : (appliedCoupon?.code || formData.discountCode || null),
      shippingCost,
      clientAppliedCoupon: !!isClientOnlyCoupon
    };

    // 2️⃣ UPI or Partial Payment Flow
    if (formData.paymentMethod === "upi" || formData.paymentMethod === "partialcod") {
      const paymentAmount = formData.paymentMethod === "partialcod" ? subtotal * 0.25 + 45 : total;

      // Create Razorpay order from backend
      const { data: razorpayOrder } = await axios.post(
        "https://sashvara-2.onrender.com/api/payment/order",
        { amount: paymentAmount }
      );

      if (!razorpayOrder?.id) {
        toast.error("Payment initialization failed", { position: "top-center" });
        return;
      }

      const publicKey =
        import.meta.env.VITE_RAZORPAY_MODE === "live"
          ? import.meta.env.VITE_RAZORPAY_KEY_ID_LIVE
          : import.meta.env.VITE_RAZORPAY_KEY_ID_TEST;

      if (!publicKey) {
        toast.error("Payment configuration error", { position: "top-center" });
        return;
      }
      if (!window.Razorpay) {
        toast.error("Payment system is loading. Please wait a moment and try again.", { position: "top-center" });
        return;
      }

      const options = {
        key: publicKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "Sashvara Shop",
        description: "Order Payment",
        order_id: razorpayOrder.id,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone
        },
        theme: { color: "#001f3f" },
        handler: async function (response) {
          try {
            // 2a️⃣ Verify Razorpay payment
            const verifyRes = await axios.post("https://sashvara-2.onrender.com/api/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (!verifyRes?.data?.status && !verifyRes?.data?.success) {
              toast.error("Payment verification failed", { position: "top-center" });
              return;
            }

            // 2b️⃣ Save order after successful payment
            const res = await fetch("https://sashvara-2.onrender.com/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...orderPayload, amountPaid: paymentAmount, status: "Paid" })
            });
            const text = await res.text().catch(() => "");
            const savedOrder = text ? JSON.parse(text) : null;

            if (!savedOrder?._id) {
              toast.error("Order could not be saved", { position: "top-center" });
              return;
            }

            toast.success("Payment verified & order confirmed!", { position: "top-center" });
            await showThankYouAndGoHome();
          } catch (err) {
            console.error("Payment handler error:", err);
            toast.error("Error verifying payment", { position: "top-center" });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      // 3️⃣ COD Flow
      const res = await fetch("https://sashvara-2.onrender.com/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...orderPayload, amountPaid: 0, status: "Pending" })
      });

      try {
        const sid = localStorage.getItem("checkoutSessionId");
        if (sid) {
          await axios.post(`https://sashvara-2.onrender.com/api/checkouts/${sid}/complete`);
          localStorage.removeItem("checkoutSessionId");
        }
      } catch (err) {
        console.warn("Could not complete checkout session (COD)", err);
      }

      toast.success("Order placed successfully. Payment will be collected on delivery.", { position: "top-center" });
      await showThankYouAndGoHome();
    }
  } catch (err) {
    console.error("Checkout error:", err);
    toast.error(`Failed to complete order: ${err?.message || "Unknown error"}`, { position: "top-center" });
  }
};

async function applyCouponServer() {
  const code = (formData.discountCode || "").trim().toUpperCase();
  const USED_KEY = "letstryit_used_v1";

  if (!code) {
    return toast("Enter a coupon code", { position: "top-center" });
  }

  if (code !== "LETSTRYIT") {
    setDiscountAmount(0);
    setAppliedCoupon(null);
    return toast.error("Invalid coupon code", { position: "top-center" });
  }

  // ✅ CHECK: Only allow for UPI payment method
  if (formData.paymentMethod !== "upi") {
    setDiscountAmount(0);
    setAppliedCoupon(null);
    return toast.error("Coupon valid only for UPI payments", {
      position: "top-center",
    });
  }

  // Check if already used
  if (localStorage.getItem(USED_KEY)) {
    setDiscountAmount(0);
    setAppliedCoupon(null);
    return toast.error("This coupon has already been used", {
      position: "top-center",
    });
  }

  // Apply flat ₹100 discount
  const discount = Math.min(100, subtotal);

  setDiscountAmount(discount);
  setAppliedCoupon({
    code: "LETSTRYIT",
    type: "flat",
    value: 100,
  });

  setFormData((prev) => ({
    ...prev,
    discountCode: "LETSTRYIT",
  }));

  toast.success("₹100 discount applied 🎉", {
    position: "top-center",
  });
}




  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key === STORAGE_KEY_CHECKOUT || e.key === STORAGE_KEY_CHECKOUT_LEGACY) {
        const parsed = safeParse(e.newValue, null);
        if (parsed) setFormData(parsed);
      }
      if (e.key === STORAGE_KEY_CART || e.key === "cartItems") {
        const parsed = safeParse(e.newValue, null);
        if (Array.isArray(parsed)) setCartItems(parsed.map(it => ({ ...it, qty: Number(it.qty) || 1 })));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setCartItems]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  // Add this useEffect near the top of your component, after your other useEffects
useEffect(() => {
  // Load Razorpay SDK
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = () => {
    console.log('Razorpay SDK loaded successfully');
  };
  script.onerror = () => {
    console.error('Failed to load Razorpay SDK');
    toast.error('Payment system failed to load. Please refresh the page.', {
      position: 'top-center'
    });
  };
  
  // Only add if not already present
  if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
    document.head.appendChild(script);
  }

  // Cleanup function
  return () => {
    // Optional: remove script on unmount if needed
    // script.remove();
  };
}, []);
 
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
                        src={imageUrl("https://res.cloudinary.com/dgnevjqr6/image/upload/v1769093437/UPIicon_r8anrc.png")}
                        alt="Upi Icon"
                        className="w-[10%] opacity-80"
                      />
                    </span>
                    <span id="UpiSpan" className="peer-checked:text-[#001f3f] ml-[12%] flex">  Razorpay Secure (UPI, Cards, Wallets, NetBanking) </span> <p id="upiShipPrice" className="mr-[9%] text-[#016B00]">₹{totalpayupi}</p>
                  </label>
                </div>
                {/* 
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
                    <span id="codSpan" className="peer-checked:text-[#001f3f] ml-[15%]">  Cash on Delivery</span><p id="CodShipPrice" className="ml-[40%] text-[#FF2B00] ">₹{totalpaycod} </p>
                  </label>
                </div>*/}

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
                        src={imageUrl("https://res.cloudinary.com/dgnevjqr6/image/upload/v1769093436/partialicon_b2ex3o.png")}
                        alt="Partial Icon"
                        className="w-[10%] opacity-80"
                      />
                    </span>
                    <span id="partialSpan" className="flex peer-checked:text-[#001f3f] ml-[15%]"> Partial COD (Pay 25%) </span> <p id="PartialShipPrice" className="ml-[30%] ">₹{totalpayPartial}</p>
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
              <label id="discountlabel" htmlFor="discountCode" className="block text-sm font-medium text-[#016B00] mb-1 ml-[2%]">
                APPLY COUPON-"LETSTRYIT"
              </label>
              
              <div id="discountField" className="flex gap-[5%] mb-[3%] ml-[2%] ">
                <input
                  type="text"
                  id="discountCode"
                  name="discountCode"
                  value={formData.discountCode}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 text-[#016B00] rounded-md focus:outline-none focus:ring-2 focus:ring-[#27ADF5] focus:border-transparent"
                  style={{ borderRadius: "5px", minHeight: "35px" }}
                  placeholder="Enter discount code- LETSTRYIT"
                />
                
                <PrimaryButton
                  type="button"
                  id="applyButton"
                  onClick={() => applyCouponServer()}
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
                <span className="font-medium" style={{fontFamily: "Roboto meduim"}}>₹{subtotal.toLocaleString()}</span>
              </div>

              <div id="shippingWrap" className="flex justify-start ml-[2%] gap-[45%] ">
                <span className="text-gray-600 flex items-center">Shipping</span>
                <span className="font-medium text-[90%] text-[#000000]">
                  {shippingCost === 0 ? "" : `₹${shippingCost.toLocaleString()}`}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex text-green-600 gap-[28%] ml-[2%]">
                  <span>Coupon Discount</span>
                  <span className="text-center text-[#016B00] ">-₹{Math.round(discountAmount).toLocaleString()}</span>
                </div>
              )}



              <div id="totalWrap" className="flex justify-start text-lg font-bold pt-2 gap-[40%] ml-[2%]">
                <span>Total</span>
                <span className="" style={{ fontSize: "1.4rem", fontFamily: "Roboto meduim"}}>INR ₹{total.toLocaleString()}</span>
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
