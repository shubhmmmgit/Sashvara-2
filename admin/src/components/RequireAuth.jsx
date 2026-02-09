// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const token = localStorage.getItem("admin_token");
  const location = useLocation();

  // If no token, redirect to admin login preserving destination
  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  // Optional: you can add a quick synchronous token shape check here
  // (or perform an async /auth/me ping and show loading/redirect accordingly).
  return children;
}
