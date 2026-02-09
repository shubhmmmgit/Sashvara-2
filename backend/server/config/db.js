// server/config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });

const mongoUri = process.env.MONGODB_ATLAS_URI || "mongodb+srv://shubhamjha2003_db_user:sNhUGtfF82wU4mUf@cluster0.oac5gak.mongodb.net/sashvara?retryWrites=true&w=majority&appName=Cluster0";

export const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB");
  } catch (err) {
    console.error(" Mongo connection error", err);
    process.exit(1);
  }
};
