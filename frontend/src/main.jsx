// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
window.onerror = function (msg, url, line) {
  alert("ERROR: " + msg + " at line " + line);
};

window.onunhandledrejection = function (e) {
  alert("PROMISE ERROR: " + e.reason);
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
    <CartProvider>
      <App />
    </CartProvider>
    </HelmetProvider>
  </React.StrictMode>
);
