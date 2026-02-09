// backend/server/models/AdminUser.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const AdminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: { type: String },
  role: { type: String, default: "admin" },
}, { timestamps: true });

// instance method to compare password
AdminUserSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// static helper to create user from password
AdminUserSchema.statics.createFromPassword = async function (email, plain, name = "") {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(plain, saltRounds);
  return this.create({ email, passwordHash, name, role: "admin" });
};

export default mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);
