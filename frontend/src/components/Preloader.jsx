import React from "react";

export default function Preloader({ hidden = false }) {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Logo with spin or bounce animation */}
      <img
        src="/images/sashvaralogoblue.png"          
        alt="Logo"
        className="w-[30%] h-[30%] ml-[10%] justify-center animate-bounce" 
      />

      
      <p className="mt-4 text-gray-600 text-lg animate-pulse">
        Loading...
      </p>
    </div>
  );
}
