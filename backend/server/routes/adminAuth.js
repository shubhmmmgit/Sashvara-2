// adminAuth.js
import express from "express";
import jwt from "jsonwebtoken";
import AdminUser from "../models/Adminuser.js";

const router = express.Router();

// POST /admin/api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing" });

    const user = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "invalid" });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ error: "invalid" });

    const payload = { sub: user._id.toString(), role: user.role, email: user.email };
    const expiresIn = remember ? "30d" : "7d";
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("token", token, cookieOpts);
    return res.json({ success: true, token, user: { email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error("admin login err:", err);
    return res.status(500).json({ error: "server" });
  }
});

// POST /admin/api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

export default router;
