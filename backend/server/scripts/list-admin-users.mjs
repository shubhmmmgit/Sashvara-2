// list-admin-users.mjs
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });

import { connectDB } from "../config/db.js";
import AdminUser from "../models/Adminuser.js";

async function run() {
  await connectDB();
  const users = await AdminUser.find({}).lean();
  console.log("ADMIN USERS:");
  for (const u of users) {
    console.log(JSON.stringify({ _id: u._id.toString(), email: u.email, name: u.name, createdAt: u.createdAt }, null, 2));
  }
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
