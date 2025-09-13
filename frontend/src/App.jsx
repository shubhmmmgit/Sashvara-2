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
import ProductTest from "./components/ProductTest";
import { Toaster } from "react-hot-toast";


function App() {
 
  const { cartItems, setCartItems } = useCart();

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

            {/* ✅ Full Cart Page */}
            <Route
              path="/cart"
              element={
                <CartDrawer
                  products={cartItems}
                  setProducts={setCartItems}
                  open={true}
                  setOpen={() => {}} // not needed in page mode
                  asPage={true}      // render as full page
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
           <ProductTest />
        </main>

        {/* Footer always at bottom */}
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
