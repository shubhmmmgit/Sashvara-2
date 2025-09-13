// ESM script (your backend package.json has "type":"module")
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: "./server/.env" }); // loads server/.env

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error("MONGO_URI not found in server/.env. Check the file and path.");
  process.exit(1);
}

await mongoose.connect(MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Use a loose schema to avoid importing your model file
const Product = mongoose.model(
  "Product",
  new mongoose.Schema({}, { strict: false }),
  "products" // name of the collection in MongoDB (adjust if different)
);

const products = await Product.find({}).select("name image").limit(200).lean();

if (!products.length) {
  console.log("No products found (or collection name is not 'products').");
} else {
  console.log(`Found ${products.length} product(s). Printing (id | name | image):\n`);
  products.forEach((p) => {
    console.log(String(p._id).padEnd(24), " | ", (p.name || "").padEnd(30), " | ", p.image);
  });
}

await mongoose.disconnect();
process.exit(0);
