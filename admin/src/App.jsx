// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./pages/Header";
import Dashboard from "./pages/Dashboard";
import VisitorTracker from "./pages/VisitorTracker";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Orders from "./pages/Orders";
import Invoice from "./pages/Invoice";
import AnalyticsDetail from "./pages/AnalyticsDetail";
import Coupons from "./pages/Coupons";
export default function App() {
  return (
    <BrowserRouter>
      {/* App layout: header on all pages */}
      <Header />

      {/* Put the visitor tracker at top-level so route changes are tracked */}
      <VisitorTracker />

      <main className="ml-[15%]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products/> }/>
          <Route path="/admin/products/:id" element={<ProductDetail />} />
          <Route path="/orders" element={<Orders/>} />
          <Route path="/invoices" element={<Invoice/>} />
           <Route path="/coupons" element= {<Coupons/>}/>
          <Route path="/analytics" element={<AnalyticsDetail  apiBase="https://sashvara-2.onrender.com/api" withCredentials={false}/>}/>
          {/*<Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
           add other admin routes here (products, orders, etc.) */}
        </Routes>
      </main>
    </BrowserRouter>
  );
}
