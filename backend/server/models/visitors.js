import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema({
  path: String,
  url: String,
  city: String,
  device: {
    type: { type: String, default: "unknown" }, // "mobile"/"desktop"
    os: String,
    browser: String,
    screenWidth: Number,
    screenHeight: Number,
  },
  ts: { type: Date, default: Date.now },
});

export default mongoose.model("Visitor", visitorSchema);
