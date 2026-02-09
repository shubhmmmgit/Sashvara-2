# Sashvara - Setup Guide

## 🚀 Quick Start

### 1. Environment Variables Setup

1. **Copy the template:**
   ```bash
   cp env-template.txt .env
   ```

2. **Fill in your actual values in the `.env` file:**

#### Required Variables:
```env
# MongoDB (choose one)
MONGODB_URI=mongodb://127.0.0.1:27017/sashvara
# OR for MongoDB Atlas:
# MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/sashvara

# Cloudinary (get from https://cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Optional Variables:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 2. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use: `MONGODB_URI=mongodb://127.0.0.1:27017/sashvara`

#### Option B: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace username/password in the connection string

### 3. Cloudinary Setup

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign up/Login
3. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

### 4. Start the Server

```bash
# Install dependencies (if not done)
npm install

# Start the server
npm run server
```

The server will start on `http://localhost:5000`

## 📋 API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product with images
- `POST /api/products/:id/image` - Upload single image
- `POST /api/products/:id/images` - Upload multiple images
- `DELETE /api/products/:id` - Delete product

### Health Check
- `GET /health` - Server health check

## 🔧 File Upload Usage

### Single Image Upload
```bash
curl -X POST http://localhost:5000/api/products/:id/image \
  -F "image=@/path/to/image.jpg"
```

### Multiple Images Upload
```bash
curl -X POST http://localhost:5000/api/products/:id/images \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### Create Product with Images
```bash
curl -X POST http://localhost:5000/api/products \
  -F "productId=PROD001" \
  -F "productName=Sample Product" \
  -F "category=Clothing" \
  -F "mrp=1000" \
  -F "sellPrice=800" \
  -F "gender=Men" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

## 🛠️ Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify connection string
   - Check network connectivity

2. **Cloudinary Upload Error**
   - Verify Cloudinary credentials
   - Check file size (max 5MB)
   - Ensure file is an image

3. **Port Already in Use**
   - Change PORT in .env file
   - Kill process using the port

4. **File Upload Fails**
   - Check file size limit (5MB)
   - Ensure file is image format
   - Verify field name is 'image' or 'images'

## 📁 Project Structure

```
server/
├── index.js              # Main server file
├── middleware/
│   └── multer.js         # File upload configuration
├── models/
│   └── product.js        # Product schema
├── routes/
│   └── productRoutes.js  # Product API routes
└── services/
    └── cloudinary.js     # Cloudinary service
```

## 🔒 Security Notes

- Never commit `.env` file to version control
- Use strong, unique passwords for databases
- Keep API keys secure
- Use HTTPS in production
- Validate all user inputs

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use MongoDB Atlas or production MongoDB
3. Configure proper CORS settings
4. Set up environment-specific variables
5. Use PM2 or similar process manager
6. Set up proper logging
7. Configure SSL/HTTPS

