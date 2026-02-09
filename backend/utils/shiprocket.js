import axios from "axios";

const BASE = process.env.SHIPROCKET_BASE || "https://apiv2.shiprocket.in/v1/external";
const EMAIL = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;

let tokenCache = { token: null, expiresAt: 0 };

async function login() {
  console.log("[shiprocket] login with email:", EMAIL);
  const resp = await axios.post(`${BASE}/auth/login`, { email: EMAIL, password: PASSWORD });
  console.log("[shiprocket] login resp:", resp.data);

  const token = resp?.data?.token;
  if (!token) throw new Error("Shiprocket login failed: no token returned");

  const expiresIn = resp?.data?.expires_in || 3600;
  tokenCache.token = token;
  tokenCache.expiresAt = Date.now() + (expiresIn - 60) * 1000;
  return token;
}

export async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  return login();
}

export async function shiprocketPost(path, payload) {
  const token = await getToken();
  console.log("[shiprocket] POST", path, "token valid:", !!token, "payload:", payload);

  const url = `${BASE}${path}`;
  const resp = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
  console.log("[shiprocket] resp:", resp.data);

  return resp.data;
}
