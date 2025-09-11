import React from "react";

const PrimaryButton = ({ children, onClick, className = "", type = "button", ...props }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`primary-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default PrimaryButton;
