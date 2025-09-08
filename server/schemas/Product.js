import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);


