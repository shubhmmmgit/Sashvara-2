import mongoose from 'mongoose';
const BusinessSchema = new mongoose.Schema({ name: String, gstin: String, pan: String, address: mongoose.Schema.Types.Mixed, contact: mongoose.Schema.Types.Mixed });
export default mongoose.model('Business', BusinessSchema);