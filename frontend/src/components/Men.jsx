// src/pages/Men.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import ProductList from "../components/ProductList";
import PrimaryButton from "../components/PrimaryButton";
import { IoMdHome } from "react-icons/io";
;

/**
 * Dedicated Men page
 * - Uses ProductList with gender="men"
 * - Includes breadcrumb, sort/limit controls, optional filters
 */

export default function Men() {
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div className="pt-8 pb-6">
        {/* Breadcrumb & Header 
        <nav className="text-sm mb-2" aria-label="Breadcrumb">
          <ul className="list-none flex text-gray-600">
            <li> 

              <Link to="/" className="hover:underline text-[#001f3f] visited:text-[#001f3f]">
              <IoMdHome />
              </Link>
            </li>
            
            <li> 
                <Link to="/men" className="hover:underline text-[#001f3f] visited:text-[#001f3f] ">
                  /men
              </Link>
              </li>
          </ul>
        </nav>*/}
                     <div>
            <h1 className="text-3xl  text-center text-[#001f3f]">Men</h1>
            <p className="text-sm  text-center text-[#001f3f]">
              Discover our men’s collection — handpicked styles.
            </p>
          </div>

        <div className="flex items-center justify-between gap-4">
   
          {/* Sort / Limit / Filters
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
          </div> */}
        </div>
      </div>

      {/* Filter Section (optional) */}
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
                  // reset filters
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

      {/* Product List */}
      <div className="mb-12">
        <ProductList gender="men" limit={limit} />
      </div>

      {/* CTA Section
      <div className="bg-[#001f3f] text-white rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Looking for more?</h3>
          <p className="text-sm opacity-90">Sign up for updates on new men’s arrivals and offers.</p>
        </div>
        <div className="flex gap-3">
          <PrimaryButton onClick={() => (window.location.href = "/signup")}>Sign up</PrimaryButton>
          <Link to="/women" className="px-4 py-2 rounded-md border border-white/20 text-sm self-center">
            Explore Women
          </Link>
        </div>
      </div> */}
    </div>
  );
}
