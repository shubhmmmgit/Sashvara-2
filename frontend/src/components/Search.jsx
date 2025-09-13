import React, { useState, useRef, useEffect } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const BACKEND_HOST = import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com";

export default function Search({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function handleDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setSuggestions([]);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        setSuggestions([]);
      } 
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [query, navigate]);

  // Fetch product suggestions
  useEffect(() => {
    const controller = new AbortController();

    async function fetchSuggestions() {
      if (!query.trim()) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `${BACKEND_HOST}/api/products/search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const data = await res.json();
        const items = data?.data ?? [];
        console.log("Search API response:", data);
        console.log("Products found:", items);
        if (items.length > 0) {
          console.log("First product:", items[0]);
          console.log("First product variants:", items[0].variants);
        }
        setSuggestions(items.slice(0, 8)); // show top 8 products
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Search suggestions error:", err);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }

    const delay = setTimeout(fetchSuggestions, 300); // debounce typing
    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [query]);

  // Submit full search
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setSuggestions([]);
    }
  };

  // Helper function to get the cheapest price from variants
  const getCheapestPrice = (product) => {
    if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
      return { sell_price: null, mrp: null };
    }
    
    const cheapest = product.variants.reduce((cheapest, variant) => {
      const variantPrice = variant.sell_price || variant.mrp || Infinity;
      const cheapestPrice = cheapest.sell_price || cheapest.mrp || Infinity;
      return variantPrice < cheapestPrice ? variant : cheapest;
    });
    
    return {
      sell_price: cheapest.sell_price || null,
      mrp: cheapest.mrp || null
    };
  };

  // Handle suggestion click
  const handleSuggestionClick = (product) => {
    navigate(`/product/${product.product_id || product._id}`);
    setOpen(false);
    setQuery("");
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className={`search-root relative ${className}`.trim()}>
      
      <button
        aria-expanded={open}
        aria-controls="site-search"
        onClick={() => setOpen((s) => !s)}
        className="search-toggle p-3 rounded hover:bg-gray-100 focus:outline-none flex items-center justify-center"
        title="Search"
      >
        <IoSearchOutline className="text-[25px] text-[#001f3f]" />
      </button>

      <div
        id="site-search"
        ref={wrapperRef}
        className={`search-dropdown ${open ? "open" : ""}`}
        aria-hidden={!open}
        style={{ position: "fixed", left: 0, right: 0, zIndex: 900 }}
      >
        <div className="search-box" role="search">
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search for products, categories..."
              className="search-input"
              aria-label="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          
          {/* Product Suggestions */}
          {(suggestions.length > 0 || loading) && (
            <div className="suggestions-dropdown">
              {loading ? (
                <div className="suggestion-item loading">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                  </div>
                </div>
              ) : (
                suggestions.map((product) => {
                  const prices = getCheapestPrice(product);
                  const imageUrl = product.images?.[0] ? 
                    (product.images[0].startsWith('http') ? product.images[0] : `${BACKEND_HOST}${product.images[0]}`) 
                    : null;
                  
                  return (
                    <div
                      key={product.product_id || product._id}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(product)}
                    >
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.product_name}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-12 h-12 bg-gray-200 rounded flex items-center justify-center ${imageUrl ? 'hidden' : 'flex'}`}
                        >
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="suggestion-name truncate">
                            {product.product_name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {product.category} {product.colour ? `· ${product.colour}` : ""}
                          </div>
                          {product.variants?.[0]?.size && (
                            <div className="text-xs text-gray-500 visited:text-[#001f3f] ">
                              Available in {product.variants.map(v => v.size).join(", ")}
                            </div>
                          )}
                        </div>
                        
                        {(prices.sell_price || prices.mrp) && (
                          <div className="suggestion-price text-right">
                            <div className="font-semibold text-gray-900">
                              ₹{Number(prices.sell_price || prices.mrp).toLocaleString()}
                            </div>
                            {prices.mrp && prices.sell_price && prices.mrp > prices.sell_price && (
                              <div className="text-xs text-gray-500 line-through">
                                ₹{Number(prices.mrp).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Show more results link */}
              {suggestions.length > 0 && (
                <div className="suggestion-item view-all">
                  <div className="text-center py-2">
                    <button
                      onClick={() => {
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                        setOpen(false);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      View all results for "{query}"
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}