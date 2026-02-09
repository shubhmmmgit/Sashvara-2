import mongoose from 'mongoose';
const InvoiceSchema = new mongoose.Schema({ order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', unique: true }, invoiceNumber: { type: String, unique: true }, pdfUrl: String, createdAt: { type: Date, default: Date.now } });
export default mongoose.model('Invoice', InvoiceSchema);