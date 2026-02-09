// routes/visitorRoutes.js
import express from "express";
import Visitor from "../models/visitors.js"; // adjust path if needed

const router = express.Router();

// POST /api/visitors
router.post("/", async (req, res) => {
  try {
    // map/normalize incoming payload to your Visitor schema shape
    const p = req.body || {};
    const device = p.device || {};
    const screen = device.screen || {};

    const visitorData = {
      path: p.path || (p.url ? new URL(p.url).pathname : "unknown"),
      url: p.url || "",
      city: p.city || "Unknown",
      device: {
        type: device.type || "unknown",
        os: device.os || device.platform || "",
        browser: device.ua || device.browser || "",
        screenWidth: screen.w || screen.width || null,
        screenHeight: screen.h || screen.height || null,
      },
      ts: p.ts ? new Date(p.ts) : new Date()
    };

    const visitor = await Visitor.create(visitorData);
    console.log("[visitorRoutes] saved visitor id:", visitor._id);

    // emit liveVisitor to admin namespace (we set app.set("io", adminNs) in server.js)
    const ioOrNs = req.app.get("io");
if (!ioOrNs) {
  console.warn("[visitorRoutes] no io found on app (req.app.get('io') returned falsy)");
} else {
  const payload = {
    _id: visitor._id,
    path: visitor.path,
    url: visitor.url,
    device: visitor.device,
    ts: visitor.ts ? visitor.ts.getTime() : Date.now()
  };

  try {
    // If root io was stored, io.of('/admin') will return namespace; otherwise use what was stored
    const maybeNs = (typeof ioOrNs.of === "function" && ioOrNs.of("/admin")) || ioOrNs;
    console.log("[visitorRoutes] emitting liveVisitor via", typeof maybeNs.name === "string" ? maybeNs.name : "io-root");
    maybeNs.emit("liveVisitor", payload);
  } catch (err) {
    console.error("[visitorRoutes] emit failed:", err);
  }
}
    res.status(201).json(visitor);
  } catch (err) {
    console.error("Error saving visitor:", err);
    res.status(500).json({ error: "Failed to save visitor" });
  }
});

export default router;
