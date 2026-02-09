import mongoose from 'mongoose';
const AdminOrderItemSchema = new mongoose.Schema({ productId: mongoose.Schema.Types.ObjectId, variantId: mongoose.Schema.Types.ObjectId, productName: String, qty: Number, rate: Number, taxRate: Number, taxAmount: Number, amount: Number });
const AdminOrderSchema = new mongoose.Schema({
orderNumber: { type: String, unique: true },
customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
customerSnapshot: mongoose.Schema.Types.Mixed,
items: [AdminOrderItemSchema],
subtotal: Number,
taxTotal: Number,
shipping: Number,
discount: Number,
total: Number,
coupon: mongoose.Schema.Types.ObjectId,
status: { type: String, enum: ['pending','shipped','completed','cancelled'], default: 'pending' },
paid: { type: Boolean, default: false },
createdAt: { type: Date, default: Date.now },
updatedAt: { type: Date, default: Date.now },
metadata: mongoose.Schema.Types.Mixed
});
export default mongoose.model('AdminOrder', AdminOrderSchema);