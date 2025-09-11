// server/config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sashvara";

export const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB");
  } catch (err) {
    console.error(" Mongo connection error", err);
    process.exit(1);
  }
};
