// VisitorTracker.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_ORIGIN } from "../services/api";

export default function VisitorTracker() {
  const location = useLocation();

  useEffect(() => {
    const deviceInfo = {
      type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
      os: navigator.platform || "",
      ua: navigator.userAgent || "",
      screen: { w: window.innerWidth, h: window.innerHeight },
    };

    const payload = {
      path: location.pathname,
      url: window.location.href,
      city: "Unknown",
      device: deviceInfo,
      ts: Date.now(),
    };

    // send once per route change
    fetch(`${API_ORIGIN}/api/visitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.debug("[VisitorTracker] post failed:", err?.message || err);
    });
  }, [location.pathname]);

  return null;
}
