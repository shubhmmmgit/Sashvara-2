// server/routes/userRoutes.js
import express from "express";
import User from "../models/user.js";

const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error(" Error creating user:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Admin
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get a single user by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(" Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
