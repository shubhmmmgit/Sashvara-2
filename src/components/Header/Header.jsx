import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HashLink as Link } from "react-router-hash-link";
import Search from "../Search";
import CartDrawer from "../CartDrawer";
import Login from "../Login";
import { useCart } from "../../context/CartContext";
import { FaTruck } from "react-icons/fa";
import { MdOutlineShoppingCart } from "react-icons/md";
import { IoPersonSharp } from "react-icons/io5";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { cartItems, setCartItems } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const totalQty = cartItems.reduce((acc, item) => acc + item.qty, 0);

  // Always show header on all routes (including /login)

  return (
    <header className="sticky top-0 left-0 right-0 z-[100000] bg-white shadow pointer-events-auto ">
      {/* Top strip */}
      <div className="top-strip bg-black py-2" style={{ backgroundColor: "#001f3f" }}>
        <div className="container">
          <div className="flex justify-center">
            <div className="col1 flex items-center justify-center gap-2 text-white text-[14px]">
              <FaTruck /> Free Shipping On Orders Above ₹999
            </div>
          </div>
        </div>
      </div>

      {/* Header main */}
      <div className="header border-b border-gray-200">
        <div className="container py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="col1">
            <Link to={"/"}>
              <img
                src="/images/sashvaralogoblue.png"
                alt="logo"
                className="w-[100px] h-auto object-contain"
              />
            </Link>
          </div>

          {/* Nav links */}
          <nav className="col2 flex justify-between items-center px-6 py-3 bg-white shadow">
            <ul className="flex list-none space-x-6">
              <li><Link smooth to="/#women" className="text-[18px] no-underline">WOMEN</Link></li>
              <li><Link smooth to="/#men" className="text-[18px] no-underline">MEN</Link></li>
              <li><Link smooth to="/#bestsellers" className="text-[18px] no-underline whitespace-nowrap">BEST SELLERS</Link></li>
              <li><Link smooth to="/#newarrival" className="text-[18px] no-underline">NEW ARRIVALS</Link></li>
              <li><Link smooth to="/#collections" className="text-[18px] no-underline">COLLECTIONS</Link></li>
            </ul>
          </nav>

          {/* Right-side icons */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <Search />

            {/* Cart button */}
            <button
              onClick={() => navigate("/cart")}
              className="relative w-10 h-10 flex items-center justify-center bg-transparent border-0 hover:bg-gray-100 rounded-md focus:outline-none"
            >
              <MdOutlineShoppingCart className="text-[30px] text-[#001f3f]" />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalQty}
                </span>
              )}
            </button>

            {/* Drawer removed in favor of dedicated Cart page */}

            {/* Login button */}
            <button
              onClick={() => navigate("/login")}
              className="bg-transparent border-0 hover:bg-gray-100 p-2 rounded-md"
            >
              <IoPersonSharp className="text-[30px] text-[#001f3f]" />
            </button>

            {/* Login Modal */}
            {loginOpen && (
              <Login
                open={loginOpen}
                onClose={() => setLoginOpen(false)}
                onLogin={(user) => {
                  console.log("User logged in:", user);
                  setLoginOpen(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
