// create-admin-user.mjs
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });

import { connectDB } from "../config/db.js"; // adjust path if your connectDB is in a different place
import AdminUser from "../models/Adminuser.js";

async function run() {
  await connectDB();
  const email = process.argv[2] || "admin@example.com";
  const pass = process.argv[3] || "Admin@1234";
  const name = process.argv[4] || "Admin";

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    console.log("Admin user already exists:", existing.email);
    process.exit(0);
  }

  const u = await AdminUser.createFromPassword(email, pass, name);
  console.log("Created admin:", u.email);
  process.exit(0);
}
run().catch((err) => {
  console.error("create-admin-user error:", err);
  process.exit(1);
});
