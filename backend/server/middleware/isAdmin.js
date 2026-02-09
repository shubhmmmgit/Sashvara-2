// server/middleware/isAdmin.js
import jwt from "jsonwebtoken";
import AdminUser from "../models/Adminuser.js";
import mongoose from "mongoose";

export default async function isAdmin(req, res, next) {
  try {
    // 1) extract token from Authorization header or cookies
    const header = req.headers.authorization;
    const cookieToken = req.cookies?.adminToken || req.cookies?.token;
    if (!header && !cookieToken) {
      return res.status(401).json({ error: "unauth", message: "no token provided" });
    }
    const token = header?.startsWith("Bearer ") ? header.slice(7) : (cookieToken || header);
    if (!token) return res.status(401).json({ error: "unauth", message: "token malformed" });

    // 2) verify token
    let payload;
    try {
      // Optionally include options: { algorithms: ["HS256"], issuer: "your-app" }
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // distinguish expired token
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "unauth", message: "token expired" });
      }
      return res.status(401).json({ error: "unauth", message: "invalid token" });
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("isAdmin token payload:", payload);
    }

    // 3) find admin — prefer payload.sub (JWT standard), then common fields
    const candidate =
      payload.sub ||
      payload.id ||
      payload._id ||
      payload.userId ||
      payload.adminId ||
      null;

    let admin = null;
    if (candidate && mongoose.Types.ObjectId.isValid(candidate)) {
      admin = await AdminUser.findById(candidate).lean();
    }

    // fallback by email
    if (!admin && payload.email) {
      admin = await AdminUser.findOne({ email: String(payload.email).toLowerCase() }).lean();
    }

    if (!admin) {
      // token is valid but admin not found -> forbidden
      return res.status(403).json({ error: "unauth", message: "admin user not found", payload });
    }

    // attach admin to request
    req.admin = admin;
    // also attach token payload if needed
    req.tokenPayload = payload;

    return next();
  } catch (err) {
    console.error("isAdmin unexpected:", err);
    return res.status(500).json({ error: "server", message: err.message });
  }
}
