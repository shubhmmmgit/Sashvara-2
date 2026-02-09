// src/pages/Header.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiHome,
  FiBox,
  FiShoppingCart,
  FiFileText,
  FiBriefcase,
  FiBarChart2,
  FiMenu,
} from "react-icons/fi";
import { CiDiscount1 } from "react-icons/ci";
const Header = () => {
  const n = Date.now();
  const year = new Date(n).getFullYear();
  const location = useLocation();

  // State for collapse toggle
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/", icon: <FiHome /> },
    { name: "Products", path: "/products", icon: <FiBox /> },
    { name: "Orders", path: "/orders", icon: <FiShoppingCart /> },
    { name: "Invoices", path: "/invoices", icon: <FiFileText /> },
   
    { name: "Analytics Details", path: "/analytics", icon: <FiBarChart2 /> },
    { name: "Coupons", path: "/coupons", icon: <CiDiscount1 />},
  ];

  return (
    <>
    
      {/* Toggle Button */}
      <button
        className="toggleButton fixed top-4 left-4 z-50 text-2xl text-[#001f3f]"
        onClick={() => setCollapsed(!collapsed)}
      >
        <FiMenu />
      </button>

      {/* Sidebar */}
      <aside
      
        className={`adminHeader h-screen w-[70%] md:w-[15%] bg-[#001f3f] text-white flex flex-col fixed top-0 left-0 transform transition-transform duration-300 z-40 
          ${collapsed ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo / Brand */}
        <div className="h-[15%] flex items-center justify-center text-xl font-bold border-b border-slate-700 text-[#fff]">
          Sashvara Admin
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-[2%] ">
          <ul className="space-y-[15%] list-none">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 text-[#fff] no-underline px-3 py-2 rounded-md hover:bg-slate-700 transition ${
                    location.pathname === item.path ? "bg-slate-700" : ""
                  }`}
                  onClick={() => setCollapsed(false)} // auto close on mobile
                >
                  <span className="text-[120%] text-[#fff]">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer section */}
        <div className="footer p-[8%] border-t border-slate-700 text-sm text-slate-400">
          <p className="text-center text-[#fff] ">© {year} Sashvara</p>
        </div>
      </aside>
    </>
  );
};

export default Header;
