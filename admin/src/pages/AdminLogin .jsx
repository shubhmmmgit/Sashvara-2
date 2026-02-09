// Sashvara/admin/src/pages/AdminLogin.jsx
import React, { useState } from "react";
import { adminApi, setAdminToken } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.post("/auth/login", { email, password });

      // 1) token from JSON
      const token = res.data?.token;
      if (token) {
        // set axios header for future requests
        setAdminToken(token);
        // persist so page reloads keep the token
        localStorage.setItem("admin_token", token);
      } else {
        // fallback: cookie-only login — still proceed
        console.warn("Login succeeded but no token in JSON. Cookie may be set (check dev cookies).");
      }

      // redirect to products dashboard
      navigate("/products");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-[10%] ml-[15%] rounded shadow-md w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">Admin Login</h1>

        {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-[5%]">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
