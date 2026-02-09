// backend/index.js (or server.js)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import userSuggestionRoutes from "./routes/userSuggestionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import path from "path";
import uploadRoutes from "./routes/uploadRoutes.js";
import http from "http";
import { Server as IOServer } from "socket.io";
import isAdmin from "./middleware/isAdmin.js";
import adminInvoiceRoutes from "./routes/adminInvoice.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import adminOrdersAbandoned from "./routes/adminOrdersAbandoned.js";
import checkoutsRoutes from "./routes/checkout.js";
import visitorRoutes from "./routes/visitorRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import adminCoupons from "./routes/adminCoupon.js";
import publicCoupons from "./routes/publicCoupons.js";
import razorpayWebhookHandler from "./routes/razorpayWebhook.js";
import shiprocketRoutes from "./routes/shiprocketRoutes.js";
import AdminProduct from "./routes/Adminproduct.js";
import testMailRoutes from "./routes/testMail.js";
import homeRoutes from "./routes/home.js";

//import { listCoupons, createCoupon, deleteCoupon } from "../../controllers/couponsController.js";



dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });

const app = express();
console.log(">>> BOOTING FROM server/index.js - startup at", new Date().toISOString());
app.get("/__ping_immediate_test", (req, res) => res.json({ ok: true, ts: Date.now(), file: "server/index.js" }));
// whitelist origins (add any other frontends you need)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  
  "http://localhost:5174",
  "https://sashvaraadminpanel.netlify.app",
  "https://sashvara.com", 
 ];

// cors options
const corsOptions = {
  origin: (origin, callback) => {
    // origin undefined for non-browser tools (curl/postman)
    if (!origin) return callback(null, true);

    // allow exact matches or any Netlify preview (endsWith)
    if (allowedOrigins.includes(origin) || origin.endsWith(".netlify.app")) {
      return callback(null, true);
    }

    console.warn("[CORS] blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Apply CORS globally (before routes)


// Explicitly respond to preflight OPTIONS requests for all routes
app.options("*", cors(corsOptions));

app.post(
  "/api/payment/webhook",
  express.raw({ type: "*/*" }),
  razorpayWebhookHandler
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// small request logger for debugging
app.use((req, res, next) => {
  console.log("[REQ]", req.method, req.url, "origin:", req.get("origin") || "-");
  next();
});
app.use(cookieParser());

connectDB();
app.get("/api/_products_mount_test", (req, res) => res.json({ mounted: true, ts: Date.now() }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/__test-emit", (req, res) => {
  const ioOrNs = req.app.get("io");
  if (!ioOrNs) return res.status(500).send("no io");

  const payload = { path: "/test", url: "https://sashvara.com/test", device: { type: "desktop" }, ts: Date.now() };
  try {
    const target = (typeof ioOrNs.of === "function" && ioOrNs.of("/admin")) || ioOrNs;
    target.emit("liveVisitor", payload);
    return res.send("emitted");
  } catch (err) {
    console.error(err);
    return res.status(500).send("emit failed");
  }
});
// TEMP DEBUG: public products tester (no isAdmin) — add, restart server, then test
app.get("/admin/api/_products_public", async (req, res) => {
  try {
    const AdminProduct = (await import("./models/AdminProduct.js")).default;
    const docs = await AdminProduct.find({}).limit(30).lean();
    return res.json({ success: true, count: docs.length, products: docs });
  } catch (err) {
    console.error("PUBLIC PRODUCTS TEST ERROR:", err);
    return res.status(500).json({ success: false, error: "server" });
  }
});

// API routes
app.use("/api/products", productRoutes);
app.use("/api/suggestions", userSuggestionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/checkouts", checkoutsRoutes);  
app.use("/admin/api", isAdmin, adminInvoiceRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/orders", adminOrdersAbandoned);
app.use("/api/invoices", adminInvoiceRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/admin/api/coupons", adminCoupons);
app.use("/api/coupons", publicCoupons);
app.use("/api/shiprocket", shiprocketRoutes);
app.use("/admin/api/products", isAdmin, AdminProduct);
app.use("/api/test-mail", testMailRoutes);
app.use("/api/home", homeRoutes);



/* app.use("/admin/api/auth", adminAuthRoutes);
app.use("/admin/api/products", adminProductRoutes);
app.use("/admin/api/orders", abandonedRoutes);
app.use("/admin/api/orders", adminOrderRoutes);
app.use("/admin/api/invoices", adminInvoiceRoutes); */


// Serve static files from /public
app.use(express.static(path.join(process.cwd(), "public")));

/*
  Serve images with explicit caching and CORS header.
  Note: we set Access-Control-Allow-Origin to '*' for image assets to make them
  easy to fetch from any origin (images are non-sensitive). Keep this if you
  prefer wide image caching. If you rely on credentials for images, change '*' to a specific origin.
*/
app.use(
  "/images",
  (req, res, next) => {
    // allow images to be fetched from anywhere (no credentials)
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(process.cwd(), "public", "images"), {
    maxAge: "30d",
    etag: true,
    lastModified: true,
  })
);

// Optional: generic error handler to catch CORS issues and return clearer message
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes("CORS")) {
    return res.status(403).json({ success: false, message: "CORS blocked: origin not allowed" });
  }
  // fallback
  console.error("Unhandled error:", err);
  return res.status(500).json({ success: false, message: "Internal server error" });
});


// TEMP DEBUG: print registered routes (for debugging)
function listRoutes(app) {
  const routes = [];
  const stack = app._router && app._router.stack ? app._router.stack : [];
  stack.forEach((middleware) => {
    if (middleware.route && middleware.route.path) {
      // direct routes like app.get("/health"...)
      routes.push(middleware.route.path);
    } else if (middleware.name === "router" && middleware.handle && middleware.handle.stack) {
      // router middleware: iterate internal stack
      middleware.handle.stack.forEach((handler) => {
        const route = handler.route;
        if (route && route.path) routes.push(route.path);
      });
    }
  });
  console.log("=== Registered app routes ===");
  routes.forEach((r) => console.log(r));
  console.log("=== End routes ===");
}
listRoutes(app);

app.post("/admin/api/_dev_login", express.json(), (req, res) => {
  const origin = req.get("origin") || req.get("referer") || "-";
  const provided = (req.body?.key || req.query?.key || "").toString();

  console.log("DEV_LOGIN attempt - NODE_ENV:", process.env.NODE_ENV, "origin:", origin, "provided_key_len:", provided.length);

  const allowedAdminOrigin = "https://sashvaraadminpanel.netlify.app";
  // allow from admin origin OR allow when not production
  if (process.env.NODE_ENV === "production" && origin !== allowedAdminOrigin) {
    console.log("DEV_LOGIN blocked: origin not allowed:", origin);
    return res.status(403).json({ error: "not allowed from this origin", origin });
  }

  if (!process.env.ADMIN_DEV_KEY) {
    console.log("DEV_LOGIN blocked: ADMIN_DEV_KEY not set");
    return res.status(500).json({ error: "server_config", message: "ADMIN_DEV_KEY not configured on server" });
  }

  if (provided !== process.env.ADMIN_DEV_KEY) {
    console.log("DEV_LOGIN blocked: key mismatch (provided len vs server len):", provided.length, String(process.env.ADMIN_DEV_KEY).length);
    return res.status(401).json({ error: "unauth", message: "invalid key" });
  }

  // success: sign token and set cookie
  const token = jwt.sign({ sub: "dev-admin", role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  console.log("DEV_LOGIN success: token issued (len):", (token||"").length);
  return res.json({ success: true, token });
});

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
          allowedOrigins.includes(origin) || 
          
          origin.endsWith(".sashvara.com") )  
          {
           return callback(null, true);
          }
          
      return callback("origin not allowed", false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // optional: handle client events if you want
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});



server.listen(port, () => console.log(`API listening on :${port}`));