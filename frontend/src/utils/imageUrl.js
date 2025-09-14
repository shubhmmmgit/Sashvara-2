// src/utils/imageUrl.js
export const BACKEND_HOST = (import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com").replace(/\/$/, '');

export function imageUrl(imgPathOrUrl) {
  if (!imgPathOrUrl) return ''; // or return '/images/fallback.png'
  if (typeof imgPathOrUrl === 'string') {
    // absolute already? return as-is
    if (/^https?:\/\//i.test(imgPathOrUrl)) return imgPathOrUrl;
    // otherwise ensure leading slash then join with host
    const path = imgPathOrUrl.startsWith('/') ? imgPathOrUrl : `/${imgPathOrUrl}`;
    return `${BACKEND_HOST}${path}`;
  }
  return '';
}
