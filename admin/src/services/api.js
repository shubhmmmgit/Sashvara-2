// admin/src/services/api.js
import axios from "axios";

/**
 * Safely derive API origin:
 * - If VITE_API_ORIGIN is a full URL, extract the origin (protocol + host + optional port).
 * - If it's empty or not parseable, fall back to default host.
 */
const RAW = import.meta.env?.VITE_API_ORIGIN || "https://sashvara-2.onrender.com";

let API_ORIGIN = RAW;
try {
  // if RAW looks like 'https://host/...', extract origin
  const m = RAW.match(/^(https?:\/\/[^\/]+)/i);
  if (m) API_ORIGIN = m[1];
  else API_ORIGIN = RAW.replace(/\/+$/, "");
} catch (e) {
  API_ORIGIN = RAW.replace(/\/+$/, "");
}

const API_BASE = `${API_ORIGIN.replace(/\/+$/, "")}/api`;

// create axios instance. Use withCredentials=true only if you rely on cookie sessions.
export const adminApi = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 10000,
});

// expose debug vars and print at runtime (remove in production later)
if (typeof window !== "undefined") {
  console.debug("[adminApi] adminApi.baseURL:", adminApi.defaults.baseURL);
  console.debug("[adminApi] VITE_API_ORIGIN (raw):", RAW);
  console.debug("[adminApi] API_ORIGIN (derived):", API_ORIGIN);
  window.__ADMIN_API_BASE__ = adminApi.defaults.baseURL;
  window.__VITE_API_ORIGIN__ = RAW;
}

adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error("[adminApi] request failed:", {
      url: err?.config?.url,
      method: err?.config?.method,
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
    });
    return Promise.reject(err);
  }
);

export const adminAdminApi = axios.create({
  baseURL: `${API_ORIGIN.replace(/\/+$/, "")}/admin/api`,
  withCredentials: true,
  timeout: 10000,
});
if (typeof window !== "undefined") {
  console.debug("[adminAdminApi] base:", adminAdminApi.defaults.baseURL);
  window.__ADMIN_ADMIN_API_BASE__ = adminAdminApi.defaults.baseURL;
}

export default adminApi;
export { API_ORIGIN, API_BASE };
