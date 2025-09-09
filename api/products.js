import mongoose from 'mongoose';
import Product from '../server/models/product.js';

// Lightweight Mongo connection helper for serverless environments
let cached = global.__mongoose;
if (!cached) cached = global.__mongoose = { conn: null, promise: null };

async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      // useUnifiedTopology and useNewUrlParser are defaults in modern mongoose
    }).then((m) => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Helper: parse pathname suffix after '/products'
function getPathSuffix(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname || '';
  const idx = pathname.indexOf('/products');
  if (idx === -1) return url;
  const suffix = pathname.slice(idx + '/products'.length);
  return { url, suffix, query: Object.fromEntries(url.searchParams.entries()) };
}

async function findProductByIdentifier(identifier) {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Product.findById(identifier).exec();
    if (byId) return byId;
  }
  const byPid = await Product.findOne({ product_id: identifier }).exec();
  if (byPid) return byPid;
  const bySlug = await Product.findOne({ slug: identifier }).exec();
  if (bySlug) return bySlug;
  return null;
}

export default async function handler(req, res) {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('DB connection error:', err);
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: false, message: 'DB connection failed', error: err.message }));
  }

  const { url, suffix, query } = getPathSuffix(req);
  const segments = (suffix || '').split('/').filter(Boolean);

  try {
    // ---------- GET handlers ----------
  if (req.method === 'GET') {
  res.setHeader('Content-Type', 'application/json');
      // /products/search
      if (segments[0] === 'search') {
        const q = query.q || '';
        const limit = Number(query.limit || 10);
        const gender = query.gender;
        const category = query.category;

        if (!q || !q.trim()) {
          return res.end(JSON.stringify({ success: true, data: [], total: 0 }));
        }

        const searchTerm = q.trim();
        const searchQuery = {
          $or: [
            { product_name: { $regex: searchTerm, $options: 'i' } },
            { category: { $regex: searchTerm, $options: 'i' } },
            { product_id: { $regex: searchTerm, $options: 'i' } },
            { colour: { $regex: searchTerm, $options: 'i' } },
            { collection: { $regex: searchTerm, $options: 'i' } },
            { 'variants.size': { $regex: searchTerm, $options: 'i' } },
          ],
        };
        if (gender) searchQuery.gender = new RegExp(`^${gender}$`, 'i');
        if (category && category !== 'all') searchQuery.category = new RegExp(`^${category}$`, 'i');

        const products = await Product.find(searchQuery).limit(limit).sort({ createdAt: -1 }).exec();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, data: products, total: products.length, query: searchTerm }));
      }

      // /products/collections/new-arrivals
      if (segments[0] === 'collections' && segments[1] === 'new-arrivals') {
        const limit = parseInt(query.limit ?? '20', 10) || 20;
  const products = await Product.find({ newArrival: true }).sort({ createdAt: -1 }).limit(limit).exec();
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, data: products }));
      }

      // /products/collections/best-sellers
      if (segments[0] === 'collections' && segments[1] === 'best-sellers') {
        const limit = parseInt(query.limit ?? '20', 10) || 20;
  const products = await Product.find({ bestSeller: true }).sort({ soldCount: -1 }).limit(limit).exec();
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, data: products }));
      }

      // /products/slug/:slug
      if (segments[0] === 'slug' && segments[1]) {
        const slug = segments[1];
        const product = await Product.findOne({ slug }).exec();
  if (!product) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Product not found' })); }
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, data: product }));
      }

      // /products/variant/:variantId
      if (segments[0] === 'variant' && segments[1]) {
        const variantId = segments[1];
        if (!mongoose.Types.ObjectId.isValid(variantId)) {
          res.statusCode = 400; return res.end(JSON.stringify({ success: false, message: 'Invalid variant id' }));
        }
        const product = await Product.findOne({ 'variants._id': variantId }, { 'variants.$': 1, product_name: 1, product_id: 1, images: 1 }).exec();
  if (!product) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Variant not found' })); }
  const variant = product.variants && product.variants[0] ? product.variants[0] : null;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, data: { product, variant } }));
      }

      // /products/:identifier (single product)
      if (segments.length === 1) {
        const identifier = segments[0];
        const product = await findProductByIdentifier(identifier);
  if (!product) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Product not found' })); }
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, data: product }));
      }

      // Default: /products (list) with filters
      {
        const {
          category,
          gender,
          product_id,
          limit,
          sort = 'createdAt',
          order = 'desc',
          q,
          newArrival,
          bestSeller,
          collection,
        } = query;

        const queryObj = {};
        const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (category && category !== 'all') queryObj.category = new RegExp(`^${esc(category)}$`, 'i');
        if (gender) queryObj.gender = new RegExp(`^${esc(gender)}$`, 'i');
        if (product_id) queryObj.product_id = new RegExp(`^${esc(product_id)}$`, 'i');
        if (q) {
          const searchTerm = String(q).trim();
          if (searchTerm) {
            queryObj.$or = [
              { product_name: { $regex: searchTerm, $options: 'i' } },
              { category: { $regex: searchTerm, $options: 'i' } },
              { product_id: { $regex: searchTerm, $options: 'i' } },
              { colour: { $regex: searchTerm, $options: 'i' } },
              { gender: { $regex: searchTerm, $options: 'i' } },
              { collection: { $regex: searchTerm, $options: 'i' } },
              { 'variants.size': { $regex: searchTerm, $options: 'i' } },
            ];
          }
        }
        if (typeof newArrival !== 'undefined') queryObj.newArrival = String(newArrival).toLowerCase() === 'true';
        if (typeof bestSeller !== 'undefined') queryObj.bestSeller = String(bestSeller).toLowerCase() === 'true';
        if (collection) queryObj.collection = new RegExp(`^${collection}$`, 'i');

        const sortObj = {};
        sortObj[sort] = order === 'desc' ? -1 : 1;

        let productsQuery = Product.find(queryObj).sort(sortObj);
        if (limit) {
          const n = parseInt(limit, 10);
          if (!Number.isNaN(n) && n > 0) productsQuery = productsQuery.limit(n);
        }

        const products = await productsQuery.exec();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, data: products, total: products.length, filters: { category, gender, product_id, limit, sort, order, q, newArrival, bestSeller, collection } }));
      }
    }

    // ---------- POST: create product (expects JSON body) ----------
  if (req.method === 'POST') {
      // parse body - assume JSON (Vercel provides parsed body)
      const payload = req.body ?? {};

      // Try parse images or variants if sent as JSON string
      if (payload.images && typeof payload.images === 'string') {
        try { payload.images = JSON.parse(payload.images); } catch { payload.images = [payload.images]; }
      }
      if (payload.variants && typeof payload.variants === 'string') {
        try { payload.variants = JSON.parse(payload.variants); } catch {}
      }

      const required = ['product_id', 'product_name', 'category', 'gender', 'variants'];
      for (const k of required) if (!payload[k]) return res.status(400).end(JSON.stringify({ success: false, message: `Missing required field: ${k}` }));

      try {
        const product = await Product.create(payload);
        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, message: 'Product created', data: product }));
      } catch (err) {
        console.error('Create product error:', err);
        if (err.code === 11000) {
          const dupKey = Object.keys(err.keyValue || {})[0];
          res.statusCode = 409; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: `Duplicate key: ${dupKey}`, error: err.message }));
        }
        res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Create failed', error: err.message }));
      }
    }

    // ---------- PUT: update product by identifier ----------
    if (req.method === 'PUT') {
  if (!segments.length) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Missing identifier in path' })); }
      const identifier = segments[0];
      const product = await findProductByIdentifier(identifier);
  if (!product) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Product not found' })); }

      const payload = req.body ?? {};
      if (payload.images && typeof payload.images === 'string') {
        try { payload.images = JSON.parse(payload.images); } catch {}
      }
      if (payload.variants) {
        try { product.variants = typeof payload.variants === 'string' ? JSON.parse(payload.variants) : payload.variants; } catch {}
      }

      const updatable = [ 'product_name', 'category', 'colour', 'gender', 'slug', 'product_id', 'metadata', 'newArrival', 'bestSeller' ];
      updatable.forEach((k) => { if (typeof payload[k] !== 'undefined') product[k] = payload[k]; });

      // handle replaceImages flag
      if (payload.images) {
        if (payload.replaceImages === true || payload.replaceImages === 'true') product.images = payload.images;
        else product.images = Array.isArray(product.images) ? product.images.concat(payload.images) : payload.images;
      }

      try {
        await product.save();
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, message: 'Product updated', data: product }));
      } catch (err) {
        console.error('Update product error:', err);
        res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Update failed', error: err.message }));
      }
    }

    // ---------- DELETE: delete product by identifier ----------
    if (req.method === 'DELETE') {
  if (!segments.length) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Missing identifier in path' })); }
  const identifier = segments[0];
  const product = await findProductByIdentifier(identifier);
  if (!product) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: false, message: 'Product not found' })); }
  await Product.findByIdAndDelete(product._id).exec();
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: true, message: 'Product deleted' }));
    }

    // Method not allowed
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));

  } catch (err) {
    console.error('Products handler error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, message: 'Server error', error: err.message }));
  }
}
