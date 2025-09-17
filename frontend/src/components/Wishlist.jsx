import React, { createContext, useContext, useEffect, useState } from "react";
import { MdOutlineFavoriteBorder, MdFavorite } from "react-icons/md";

// Simple, self-contained Wishlist utilities + components
// - WishlistProvider: wrap your app with this to provide wishlist state
// - useWishlist(): hook for components to read/update wishlist
// - WishlistButton: heart button to toggle a product in wishlist
// - WishlistPage: a simple page to display saved items

const STORAGE_KEY = "sashvara_wishlist_v1";

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to read wishlist from localStorage", e);
    }
  }, []);

  // persist on change  
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to write wishlist to localStorage", e);
    }
  }, [items]);

  const add = (product) => {
    setItems((prev) => {
      if (!product || !product.id) return prev;
      if (prev.find((p) => p.id === product.id)) return prev; // already
      return [...prev, product];
    });
  };

  const remove = (productId) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  };

  const toggle = (product) => {
    if (!product || !product.id) return;
    if (items.find((p) => p.id === product.id)) remove(product.id);
    else add(product);
  };

  const isWishlisted = (productId) => items.some((p) => p.id === productId);

  const clear = () => setItems([]);

  return (
    <WishlistContext.Provider
      value={{ items, add, remove, toggle, isWishlisted, clear, count: items.length }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
};

// Heart button - drop this anywhere you have `product` object
export const WishlistButton = ({ product, size = 20, className = "" }) => {
  const { isWishlisted, toggle } = useWishlist();
  const active = product && isWishlisted(product.id);

  return (
    <button
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(product);
      }}
      className={`inline-flex items-center justify-center p-1 rounded-full focus:outline-none focus:ring-0 ${className}`}
      style={{ lineHeight: 0 }}
    >
      {active ? (
        <MdFavorite size={size} className="text-red-600" />
      ) : (
        <MdOutlineFavoriteBorder size={size} className="text-gray-600" />
      )}
    </button>
  );
};

// A simple page/list to show wishlist items; adapt layout to your design
export const WishlistPage = ({ onMoveToCart }) => {
  const { items, remove, clear } = useWishlist();

  if (!items.length)
    return (
      <div className="p-8 text-center text-gray-600">
        <p className="mb-4">Your wishlist is empty.</p>
        <p className="text-sm">Browse products and tap the heart to save them here.</p>
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Wishlist</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((p) => (
          <li key={p.id} className="flex gap-4 p-4 border rounded">
            <div className="w-24 h-28 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
              <img src={imageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-medium">{p.name}</h3>
                <p className="text-sm text-gray-500">₹{p.price}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onMoveToCart && onMoveToCart(p)}
                  className="text-sm px-3 py-2 bg-[#001a33] text-white rounded"
                >
                  Move to cart
                </button>

                <button
                  onClick={() => remove(p.id)}
                  className="text-sm px-3 py-2 bg-gray-100 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// default export is the provider for convenience
export default WishlistProvider;

/*
  Integration quick notes (not code duplicates):
  1) Wrap your app: <WishlistProvider> <App /> </WishlistProvider>
  2) Use <WishlistButton product={product} /> on product cards to toggle
  3) To show count in header: const { count } = useWishlist();
  4) Mount <WishlistPage /> at /wishlist or anywhere you like
  5) Install react-icons: npm i react-icons
*/
