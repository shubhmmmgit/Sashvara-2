import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import Home from "./Pages/Home";
import MyOrders from "./components/MyOrders";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import { useCart } from "./context/CartContext"; 
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import Collection from "./components/Collection";
import Checkout from "./components/Checkout";
import CheckoutPayment from "./components/CheckoutPayment";
import RefundPolicy from "./components/RefundPolicy";
import ShippingPolicy from "./components/ShippingPolicy";
import AboutUs from "./components/AboutUs";
import { Toaster } from "react-hot-toast";
import Women from "./components/Women";
import Men from "./components/Men";
import BestSellers from "./components/BestSellers";
import NewArrivals from "./components/NewArrivals";
import axios from "axios"; 


function App() {
 
  const { cartItems, setCartItems } = useCart();
  const [showPreloader, setShowPreloader] = useState(true);
  const [fading, setFading] = useState(false);
  
    useEffect(() => {
    const finishLoading = () => {
      setFading(true); 
      setTimeout(() => setShowPreloader(false), 30000);
    };

    if (document.readyState === "complete") {
      finishLoading(); 
    } else {
      window.addEventListener("load", finishLoading);
      return () => window.removeEventListener("load", finishLoading);
    }
  }, []);
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        await axios.post("https://sashvara-2.onrender.com/api/visitors", {
          path: window.location.pathname,
          url: window.location.href,
          city: "Unknown", // optional — you can improve later by calling ip-api, etc.
          device: {
            type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
            os: navigator.platform,
            browser: navigator.userAgent,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
          },
          ts: Date.now()
        });
      } catch (err) {
        console.error("Visitor tracking failed", err);
      }
    };

    trackVisitor();
  }, []);
  return (
    <BrowserRouter>
     
      <div className="flex flex-col min-h-screen">
        {/* Header always at top */}
        <Header />

        {/* Page content */}
        <main className="flex-1 min-h-[200px] min-w-[400px]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/search" element={<ProductList />} />
            <Route
              path="/product/:id"
              element={
                <ErrorBoundary>
                  <ProductDetail />
                </ErrorBoundary>
              }
            />

            
            <Route
              path="/cart"
              element={
                <CartDrawer
                  products={cartItems}
                  setProducts={setCartItems}
                  open={true}
                  setOpen={() => {}} 
                  asPage={true}    
                />
              }
            />
             <Route path="/checkout" element={<Checkout />} />
             <Route path="/checkout/payment" element={<CheckoutPayment />} />
             <Route path="/collections/:collection" element={<Collection />} />
             <Route path="/refund-policy" element={<RefundPolicy />} />
             <Route path="/shipping-policy" element={<ShippingPolicy/>} />
             <Route path="/aboutus" element={<AboutUs />} />
             <Route path="/women" element={<Women />} />
             <Route path="/men" element={<Men />} />
             <Route path="/best-sellers" element={<BestSellers />} />
             <Route path="/new-arrivals" element={<NewArrivals />} /> 

            
          </Routes>
           <Toaster position="top-right" reverseOrder={false} />
           
        </main>

        {/* Footer always at bottom */}
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
