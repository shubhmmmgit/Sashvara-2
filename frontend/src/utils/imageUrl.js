// src/utils/imageUrl.js
export const BACKEND_HOST = (
  import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com"
).replace(/\/$/, "");

export function imageUrl(imgPathOrUrl, opts = {}) {
  if (!imgPathOrUrl) return "";

  // default opts: w ~ 400, q auto, f auto, dpr auto for sharpness on high-dpi
  const { w = 400, h, q = "auto", f = "auto", fit = "fill", dpr = "auto" } = opts;
  const src = String(imgPathOrUrl).trim();

  if (src.includes("res.cloudinary.com")) {
    // Build transform string — include dpr if present
    // Cloudinary accepts `dpr_auto` or `dpr_2.0`. We pass whatever user passed.
    const parts = [`f_${f}`, `q_${q}`, `w_${w}`];
    if (h) parts.push(`h_${h}`, `c_${fit}`);
    if (dpr) parts.push(`dpr_${dpr}`);
    const transform = parts.join(",");
    return src.replace("/upload/", `/upload/${transform}/`);
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  const path = src.startsWith("/") ? src : `/${src}`;
  return `${BACKEND_HOST}${path}`;
}
