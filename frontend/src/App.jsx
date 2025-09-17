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
import RefundPolicy from "./components/RefundPolicy";
import ShippingPolicy from "./components/ShippingPolicy";
import AboutUs from "./components/AboutUs";
import { Toaster } from "react-hot-toast";
import Preloader from "./components/Preloader";


function App() {
 
  const { cartItems, setCartItems } = useCart();
  const [showPreloader, setShowPreloader] = useState(true);
  const [fading, setFading] = useState(false);
  
    useEffect(() => {
    const finishLoading = () => {
      setFading(true); // start fade
      setTimeout(() => setShowPreloader(false), 3000000); // unmount after fade
    };

    if (document.readyState === "complete") {
      finishLoading(); // already loaded
    } else {
      window.addEventListener("load", finishLoading);
      return () => window.removeEventListener("load", finishLoading);
    }
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
             <Route path="/collections/:collection" element={<Collection />} />
             <Route path="/refund-policy" element={<RefundPolicy />} />
             <Route path="/shipping-policy" element={<ShippingPolicy/>} />
             <Route path="/aboutus" element={<AboutUs />} />
             
            
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
