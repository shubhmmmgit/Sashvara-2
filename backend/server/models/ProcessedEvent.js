import mongoose from "mongoose";

const ProcessedEventSchema = new mongoose.Schema({
  razorpayEventId: { type: String, required: true, unique: true, index: true },
  event: { type: String },
  processedAt: { type: Date, default: Date.now }
});

export default mongoose.models.ProcessedEvent || mongoose.model("ProcessedEvent", ProcessedEventSchema);
