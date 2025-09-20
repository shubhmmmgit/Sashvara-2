// src/pages/BestSellers.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import ProductList from "../components/ProductList";
import PrimaryButton from "../components/PrimaryButton";
import { MdFilterList } from "react-icons/md";

export default function BestSellers() {
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div className="pt-8 pb-6">
        {/* Breadcrumb & Header 
        <nav className="text-sm mb-2" aria-label="Breadcrumb">
          <ol className="list-reset flex text-gray-600">
            <li>
              <Link to="/" className="hover:underline">Home</Link>
            </li>
            <li><span className="mx-2">/</span></li>
            <li className="text-[#001f3f] font-medium">Best Sellers</li>
          </ol>
        </nav>*/}
           <div>
            <h1 className="text-3xl font-bold text-center text-[#001f3f]">Best Sellers</h1>
            <p className="text-sm text-center text-[#001f3f]">
              Our most loved pieces — customer favourites and top-rated styles.
            </p>
          </div>
        <div className="flex items-center justify-between gap-4">
          
{/* Optional filters 
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm bg-white hover:shadow-sm"
            >
              <MdFilterList />
              Filters
            </button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="popular">Sort: Popular</option>
              <option value="new">Sort: New arrivals</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={50}>50</option>
            </select>
          </div>*/}
        </div>
      </div>

      
      {showFilters && (
        <div className="mb-6 bg-white p-4 rounded-md border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">Price</label>
              <input type="range" min="0" max="5000" className="w-36" />
            </div>
            <div className="flex gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">Color</label>
              <select className="border rounded-md px-2 py-1 text-sm">
                <option value="">Any</option>
                <option value="blue">Blue</option>
                <option value="black">Black</option>
                <option value="white">White</option>
              </select>
            </div>
            <div className="flex gap-2">
              <PrimaryButton onClick={() => setShowFilters(false)}>Apply</PrimaryButton>
              <button onClick={() => setShowFilters(false)} className="px-3 py-2 rounded-md border text-sm">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Product List (bestSeller boolean flag) */}
      <div className="mb-12">
        <ProductList bestSeller={true} limit={limit} />
      </div>

      {/* CTA 
      <div className="bg-[#001f3f] text-white rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Want more top picks?</h3>
          <p className="text-sm opacity-90">Subscribe for alerts on trending favourites and offers.</p>
        </div>
        <div className="flex gap-3">
          <PrimaryButton onClick={() => (window.location.href = "/signup")}>Sign up</PrimaryButton>
          <Link to="/new-arrivals" className="px-4 py-2 rounded-md border border-white/20 text-sm self-center">New Arrivals</Link>
        </div>
      </div>*/}
    </div>
  );
}
