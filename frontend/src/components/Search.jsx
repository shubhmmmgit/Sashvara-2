import React, { useState, useRef, useEffect } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const BACKEND_HOST = import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com";

export default function Search({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);      // outer wrapper
  const dropdownRef = useRef(null);     // suggestions dropdown / fixed container
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close when clicking outside or pressing Escape / Enter for search
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
        // If user pressed Enter directly (not on a suggestion), go to the search page
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

  // Fetch suggestions:
  // - If open && query is empty => fetch popular suggestions immediately
  // - If user types (query non-empty) => debounce and call search endpoint
  useEffect(() => {
    // only fetch when the search panel is open
    if (!open) {
      // abort in-flight request if panel closed
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }

    // clear previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Helper to fetch (shared)
    const doFetch = async (url) => {
      abortControllerRef.current = new AbortController();
      setLoading(true);
      try {
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = await res.json();
        const items = data?.data ?? [];
        setSuggestions(items.slice(0, 8));
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Search suggestions error:", err);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    };

    const trimmed = (query || "").trim();

    if (!trimmed) {
      // fetch popular suggestions when input is empty
      const url = `${BACKEND_HOST}/api/products/search?popular=true&limit=8`;
      doFetch(url);
      return () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
      };
    }

    // typed query -> debounce
    debounceRef.current = setTimeout(() => {
      const url = `${BACKEND_HOST}/api/products/search?q=${encodeURIComponent(trimmed)}&limit=8`;
      doFetch(url);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [query, open]);

  // Submit full search
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setSuggestions([]);
    }
  };

  // Get cheapest variant helper (keeps your existing behavior)
  const getCheapestPrice = (product) => {
    if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
      return { sell_price: null, mrp: null };
    }
    const cheapest = product.variants.reduce((cheapest, variant) => {
      const variantPrice = variant.sell_price ?? variant.mrp ?? Infinity;
      const cheapestPrice = (cheapest.sell_price ?? cheapest.mrp) ?? Infinity;
      return variantPrice < cheapestPrice ? variant : cheapest;
    }, product.variants[0] || {});
    return {
      sell_price: cheapest.sell_price ?? null,
      mrp: cheapest.mrp ?? null
    };
  };

  const handleSuggestionClick = (product) => {
    const pid = product.product_id || product._id || product.id;
    navigate(`/product/${encodeURIComponent(pid)}`);
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
        ref={dropdownRef}
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
                  const rawImage = product.images?.[0] ?? null;
                  const imageUrl = rawImage
                    ? (String(rawImage).startsWith("http") ? rawImage : `${BACKEND_HOST}${String(rawImage).startsWith("/") ? rawImage : `/${rawImage}`}`)
                    : null;

                  return (
                    <div
                      key={product.product_id || product._id || product.id}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(product)}
                    >
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.product_name}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="suggestion-name truncate">
                            {product.product_name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {product.category} {product.colour ? `· ${product.colour}` : ""}
                          </div>
                          {product.variants?.[0]?.size && (
                            <div className="text-xs text-gray-500">
                              Available in {product.variants.map(v => v.size).filter(Boolean).join(", ")}
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
