import {React, useState} from "react";
import { MdOutlineShoppingCart } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import PrimaryButton from "./PrimaryButton";
import { useNavigate } from "react-router-dom";
import { FaRegTrashAlt } from "react-icons/fa";
import toast from "react-hot-toast";



const CartDrawer = ({
  products = [],
  setProducts = () => {},
  open = true,
  setOpen = () => {},
  asPage = false,
}) => {
  const navigate = useNavigate();

  const subtotal = products.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  );

  const updateQty = (id, change) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, qty: Math.max(1, (p.qty || 1) + change) } : p
      )
    );
  };

  const removeItem = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // ---- define checkout handler BEFORE JSX ----
  const goToCheckout = () => {
    // use `products` (not cartItems)
    if (!products || products.length === 0) {
      toast("Your cart is empty. Add some items to proceed with checkout.", {
        position: "top-center",
        style: {
        background: "#fff",      
        color: "#001f3f",       
        fontWeight: "500",
        fontSize: "14px",
        border: "1px solid #001f3f",
        borderRadius: "8px",
    },

      });
      return;
    }

    
    try {
      setOpen(false);
    } catch (e) {
     
    }

  navigate("/checkout");
  };

  const renderSize = (product) => {
    
    return (
      product.size ||
      product.selectedSize ||
      product.variant?.size ||
      product.variant?.option ||
      "One Size"
    );
  };

  
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  // Page mode: render a normal page layout under the sticky header
  if (asPage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b  pb-4">
            <MdOutlineShoppingCart className="text-[30px] text-[#001f3f]" />
            <h2 className="text-lg font-semibold text-[#001f3f]">Shopping Cart</h2>
            <button
              id="cartCross"
              onClick={() => window.history.back()}
              className="p-2 rounded text-gray-400 hover:text-gray-600"
            >
              <RxCross2 />
            </button>
          </div>

          {/* Items */}
          {products.length === 0 ? (
            <p className="text-center py-10 text-[#808080]">Your cart is empty</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {products.map((product,index) => (
                <li key={product.id} className="flex py-6">
                  <div className="w-28 h-36 overflow-hidden rounded bg-gray-100 flex">
                    <img
                      src={product.image || "/images/placeholder.png"}
                      alt={product.name}
                      className={`thumb-box relative w-full max-h-[600px] rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200   ${
                        index === activeIndex
                        ? "border-[#001f3f] scale-105 shadow-md"
                        : "border-gray-200 hover:border-gray-300"}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/placeholder.png";
                      }}
                    />
                  </div>

                  <div className="ml-4 flex flex-1 flex-col ml-[5%] ">
                    <h3 className="font-medium text-[#001f3f]">{product.name}</h3>
                    <p className="text-sm text-[#808080]">₹{product.price}</p>
                    <p className="text-sm text-[#808080]">Size:{product.size}</p>

                    <div className="size-container">
                    <div className="size-box  ">
                      <button
                        onClick={() => updateQty(product.id, -1)}
                        className="minus-button"
                      >
                        –
                      </button>
                      <span>{product.qty}</span>
                      <button
                        onClick={() => updateQty(product.id, 1)}
                        className="plus-button"
                      >
                        +
                      </button>
                    </div>
                    <FaRegTrashAlt  onClick={() => removeItem(product.id)} className="text-sm px-2 py-1"> </FaRegTrashAlt>
                    </div>
                    

                    <div id="cartProductPrize" className="flex justify-end items-center mt-2" style={{fontWeight:500, fontSize:"1.5rem"}}>
                      <p className="text-[#001f3f]">
                        ₹{((product.price || 0) * (product.qty || 0)).toLocaleString()}
                      </p>
                      
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          <div  className="border-t px-0 py-4 bg-white shadow mt-6">
            <div id="cartSubtotal" className="flex justify-between items-center text-base font-medium text-[#001f3f] mb-4">
              <p>Subtotal</p>
              <p>₹{subtotal.toLocaleString()}</p>
            </div>
            <PrimaryButton type="button" onClick={goToCheckout} className="w-full py-3">
              Checkout
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  // Drawer/overlay mode (fallback)
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99990]">
      {/* Backdrop */}
      <button aria-label="Close cart" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
      {/* Panel */}
      <div className="relative pt-24 flex justify-center">
        <div className="max-w-3xl w_full px-4 py-6 bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b pb-4">
            <MdOutlineShoppingCart className="text-[30px] text-[#001f3f]" />
            <h2 className="text-lg font-semibold text-[#001f3f]">Shopping Cart</h2>
            <button onClick={() => setOpen(false)} className="p-2 rounded text-gray-400 hover:text-gray-600">
              <RxCross2 />
            </button>
          </div>

          {/* Items */}
          {products.length === 0 ? (
            <p className="text-center py-10 text-gray-500">Your cart is empty</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {products.map((product) => (
                <li key={product.id} className="flex py-6 bg-[#FAF9F6] ">
                  <div className="w-28 h-36 overflow-hidden rounded bg-gray-100 flex">
                    <img
                      src={product.image || "/images/placeholder.png"}
                      alt={product.name}
                      className={`thumb-box ${ index === activeIndex }`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/placeholder.png";
                      }}
                    />
                  </div>

                  <div className="ml-4 flex flex-1 flex-col">
                    <h3 className="font-medium text-[#001f3f]">{product.name}</h3>
                    <p className="text-sm text-gray-500">₹{product.price}</p>
                    <p className="text-sm text-gray-500">{product.size}</p>

                    <div className="flex items-center space-x-2 mt-2">
                      <button onClick={() => updateQty(product.id, -1)} className="px-2 py-1 border rounded ">
                        -
                      </button>
                      <span>{product.qty}</span>
                      <button onClick={() => updateQty(product.id, 1)} className="px-2 py-1 border rounded">
                        +
                      </button>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <p className="text-gray-900">₹{((product.price || 0) * (product.qty || 0)).toLocaleString()}</p>
                      <PrimaryButton onClick={() => removeItem(product.id)} className="text-sm px-2 py-1">
                        Remove
                      </PrimaryButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          <div className="border-t px-0 py-4 bg-white shadow mt-6">
            <div className="flex justify-between items-center text-base font-medium text-[#001f3f] mb-4">
              <p>Subtotal</p>
              <p>₹{subtotal.toLocaleString()}</p>
            </div>
            <PrimaryButton
              type="button"
              onClick={() => {
                setOpen(false);
                goToCheckout();
              }}
              className="w-full py-3"
            >
              Checkout
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
