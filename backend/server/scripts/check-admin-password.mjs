// check-admin-password.mjs
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });

import { connectDB } from "../config/db.js";
import AdminUser from "../models/Adminuser.js";

async function run() {
  await connectDB();
  const email = process.argv[2] || "admin@example.com";
  console.log("Checking admin user:", email);
  const u = await AdminUser.findOne({ email: email.toLowerCase() }).lean();
  if (!u) {
    console.log("User not found");
    process.exit(0);
  }
  console.log("Found user (partial):", { _id: u._id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt });
  console.log("Stored passwordHash (first 60 chars):", (u.passwordHash || u.password || "").slice(0, 60));
  // verify using model method
  const userModel = await AdminUser.findById(u._id);
  const testPass = process.argv[3] || "Admin@1234";
  const ok = await userModel.verifyPassword(testPass);
  console.log("verifyPassword('" + testPass + "') =>", ok);
  process.exit(0);
}

run().catch((err) => { console.error("ERROR:", err); process.exit(1); });
