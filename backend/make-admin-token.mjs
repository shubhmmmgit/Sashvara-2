// make-admin-token.mjs
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set in backend/.env — set it before running.");
  process.exit(1);
}

const token = jwt.sign({ sub: "dev-admin", role: "admin" }, process.env.JWT_SECRET, {
  expiresIn: "7d",
});

console.log(token);
