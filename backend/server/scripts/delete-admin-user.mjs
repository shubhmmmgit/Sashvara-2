// delete-admin-user.mjs
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });

import { connectDB } from "../config/db.js";
import AdminUser from "../models/Adminuser.js";

async function run() {
  await connectDB();
  const id = process.argv[2];
  if (!id) {
    console.log("Usage: node delete-admin-user.mjs <id>");
    process.exit(1);
  }
  const r = await AdminUser.findByIdAndDelete(id);
  if (r) console.log("Deleted admin user:", id);
  else console.log("No user deleted (not found):", id);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
