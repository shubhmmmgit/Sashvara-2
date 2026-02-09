// src/api.js
import axios from "axios";

const BACKEND_HOST =
  import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com";

// Preconfigured axios instance
const api = axios.create({
  baseURL: BACKEND_HOST,
  withCredentials: true, // if you use cookies/auth
});

// --- Products ---
export const fetchProducts = async (collectionName, limit = 10) => {
  try {
    const params = {
      collection: collectionName.trim().replace(/\/$/, ""), // remove trailing slash
      limit,
    };
    const res = await api.get("/api/products", { params });
    return res.data;
  } catch (err) {
    console.error("Fetch products failed:", err);
    return { success: false, data: [] };
  }
};

// Export the axios instance if you want to reuse it elsewhere
export default api;
