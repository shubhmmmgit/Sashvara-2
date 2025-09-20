// src/pages/Women.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import ProductList from "./ProductList";
import PrimaryButton from "./PrimaryButton";
import { MdFilterList } from "react-icons/md";

/**
 * Dedicated Women page that wraps ProductList.
 *
 * Notes:
 * - ProductList accepts props: gender, category, limit
 * - I'm using gender="women" here; change to "female" if your backend expects that.
 * - This page includes simple controls (sort, limit) and breadcrumb.
 */

export default function Women() {
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState("popular"); // not used by ProductList directly, but kept for UI & future use
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div className="pt-8 pb-6">
        {/* Page header
        <nav className="text-sm mb-2" aria-label="Breadcrumb">
          <ul className="list-none flex text-gray-600">
            <li>
              <Link to="/" className="hover:underline text-[#001f3f] visited:text-[#001f3f] ">
                Home
              </Link>
            </li> 
            <li> <Link to="/women" className="hover:underline text-[#001f3f] visited:text-[#001f3f] ">
                  /women
              </Link></li>
            
            
          </ul>
        </nav> */}
        <div>
            <h1 className="text-3xl font-bold text-center text-[#001f3f]">Women</h1>
            <p className="text-sm text-center  text-[#001f3f] mt-1">
              Browse our curated collection for women.
            </p>
          </div>

        <div className="flex items-center justify-between gap-4">
   
          {/* 
          <div className="flex items-center gap-[2%] mb-[2%] ">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm bg-[#ffffff] hover:shadow-sm"
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

      {/* Optional filter area */}
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
              <button
                onClick={() => {
                  // reset logic placeholder
                  setShowFilters(false);
                }}
                className="px-3 py-2 rounded-md border text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product list section */}
      <div className="mb-12">
        {/* Pass gender="women" and the selected limit */}
        <ProductList gender="women" limit={limit} />
      </div>

      {/* CTA / footer strip 
      <div className="bg-[#001f3f] text-white rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Want personalized picks?</h3>
          <p className="text-sm opacity-90">Sign up for updates on new arrivals and exclusive offers.</p>
        </div>
        <div className="flex gap-3">
          <PrimaryButton onClick={() => (window.location.href = "/signup")}>Sign up</PrimaryButton>
          <Link to="/best-sellers" className="px-4 py-2 rounded-md border border-white/20 text-sm self-center">
            View Best Sellers
          </Link>
        </div>
      </div>*/}
    </div>
  );
}
