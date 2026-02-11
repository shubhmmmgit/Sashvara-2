 import React from "react";
import {
  FaTag,
  FaTruck,
  FaExchangeAlt ,
  FaLock
} from "react-icons/fa";

const badges = [
  {
    icon: <FaTag />,
    title: "Affordable Prices",
  },
  {
    icon: <FaExchangeAlt />,
    title: "Easy Exchange",  
  },

  {
    icon: <FaLock />,
    title: "Secure Payments",
  },
];

export default function TrustBadges() {
  return (
    <section className="trustBadgeSection w-full py-6">
      <h3 className="badgeHeading text-center text-lg font-semibold text-[#001f3f] mb-4">
        Shop With Confidence
      </h3>

    <div className="flex justify-center items-center gap-12 max-w-6xl mx-auto px-4">
  {badges.map((b, i) => (
    <div
      key={i}
      className="flex flex-col items-center text-center ml-[8%] "
    >
      <div className="text-3xl text-[#001f3f] mb-2 mr-[40%]">
        {b.icon}
      </div>
     <div className="badgeTitle grid grid-cols-2">  
        <p className="text-sm mr-[4%] text-gray-700">
        {b.title}
      </p>
      </div>
    
    </div>
  ))}
</div>

    </section>
  );
}