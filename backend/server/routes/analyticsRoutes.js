// server/routes/analyticsRoutes.js
import express from "express";
import mongoose from "mongoose";
import Order from "../models/order.js";      // adjust path if different
import Visitor from "../models/visitors.js";  // adjust path if different

const router = express.Router();

/**
 * GET /api/analytics/summary
 * Returns a compact summary:
 * {
 *   sessionsTotal, users,
 *   devices: { desktop, mobile, tablet, other },
 *   sources: { organic, meta_ads, referral, manual, other },
 *   cities: [ { city, sessions }, ... ],
 *   referrers: [ { referrer, sessions }, ... ],
 *   timeseries: [ { date (YYYY-MM-DD), sessions }, ... ]
 * }
 *
 * The route attempts to compute from Visitor collection first (ideal).
 * If Visitor is not present it tries to approximate using Order data.
 */
router.get("/summary", async (req, res) => {
  try {
    // limit parameters
    const days = Math.min(Math.max(parseInt(req.query.days || "14", 10), 1), 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Helper: safe aggregation wrapper
    const safeAggregate = async (model, pipeline) => {
      try {
        return await model.aggregate(pipeline).allowDiskUse(true).exec();
      } catch (e) {
        console.warn("Aggregation failed for", model.modelName, e.message);
        return [];
      }
    };

    // Try visitors aggregation if model exists
    let devices = { desktop: 0, mobile: 0, tablet: 0, other: 0 };
    let cities = [];
    let referrers = [];
    let sources = {};
    let timeseries = [];
    let sessionsTotal = 0;
    let users = 0;

    if (Visitor && typeof Visitor.aggregate === "function") {
      // devices
      const devAgg = await safeAggregate(Visitor, [
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$device.type", count: { $sum: 1 } } }
      ]);
      devAgg.forEach(d => {
        const k = (d._id || "").toString().toLowerCase();
        if (k.includes("desktop")) devices.desktop += d.count;
        else if (k.includes("phone") || k.includes("mobile")) devices.mobile += d.count;
        else if (k.includes("tablet")) devices.tablet += d.count;
        else devices.other += d.count;
      });

      // cities
      const citiesAgg = await safeAggregate(Visitor, [
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$city", sessions: { $sum: 1 } } },
        { $sort: { sessions: -1 } },
        { $limit: 20 }
      ]);
      cities = citiesAgg.map(r => ({ city: r._id || "Unknown", sessions: r.sessions }));

      // referrers
      const refAgg = await safeAggregate(Visitor, [
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$referrer", sessions: { $sum: 1 } } },
        { $sort: { sessions: -1 } },
        { $limit: 20 }
      ]);
      referrers = refAgg.map(r => ({ referrer: r._id || "direct", sessions: r.sessions }));

      // timeseries (by day)
      const tsAgg = await safeAggregate(Visitor, [
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            sessions: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      timeseries = tsAgg.map(r => ({ date: r._id, sessions: r.sessions }));

      // sessions total & users
      const totalAgg = await safeAggregate(Visitor, [
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: null, sessions: { $sum: 1 }, users: { $addToSet: "$visitorId" } } }
      ]);
      if (totalAgg && totalAgg.length > 0) {
        sessionsTotal = totalAgg[0].sessions || 0;
        users = (await Visitor.distinct("visitorId", { createdAt: { $gte: startDate } })).length;
      } else {
        sessionsTotal = (await Visitor.countDocuments({ createdAt: { $gte: startDate } })) || 0;
        users = (await Visitor.distinct("visitorId", { createdAt: { $gte: startDate } })).length;
      }

      // Map referrers to high-level sources (approx)
      const mapRefToSource = (ref) => {
        if (!ref) return "manual";
        const r = ref.toLowerCase();
        if (r.includes("facebook") || r.includes("instagram") || r.includes("meta")) return "meta_ads";
        if (r.includes("google") || r.includes("bing") || r.includes("yahoo")) return "organic";
        if (r.includes("utm_medium=paid") || r.includes("utm_medium=cpc") || r.includes("ad")) return "paid";
        if (r.includes("referrer") || r.includes("://")) return "referral";
        return "manual";
      };

      sources = {};
      for (const r of referrers) {
        const s = mapRefToSource(r.referrer || "");
        sources[s] = (sources[s] || 0) + (r.sessions || 0);
      }
    }

    // If Visitor not present or sources incomplete, also look at Orders for source hints
    if ((!Visitor || Object.keys(sources).length === 0) && Order && typeof Order.aggregate === "function") {
      const orderAgg = await safeAggregate(Order, [
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$source", // assuming you store a `source` or `origin` field on orders like 'meta_ads', 'manual'
            count: { $sum: 1 }
          }
        }
      ]);
      orderAgg.forEach(o => {
        if (!o._id) return;
        sources[o._id] = (sources[o._id] || 0) + o.count;
      });

      // fallback timeseries from orders if timeseries empty
      if (!timeseries.length) {
        const tsOrders = await safeAggregate(Order, [
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, sessions: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]);
        timeseries = tsOrders.map(r => ({ date: r._id, sessions: r.sessions }));
      }

      if (!sessionsTotal) sessionsTotal = (await Order.countDocuments({ createdAt: { $gte: startDate } })) || 0;
    }

    // ensure timeseries has an entry for each day in range (fill 0s)
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const k = d.toISOString().slice(0, 10);
      dayMap[k] = 0;
    }
    timeseries.forEach(t => { if (t.date) dayMap[t.date] = (dayMap[t.date] || 0) + (t.sessions || 0); });
    const timeseriesOut = Object.keys(dayMap).sort().map(d => ({ date: d, sessions: dayMap[d] }));

    // final object
    const summary = {
      sessionsTotal,
      users,
      devices,
      sources,
      cities,
      referrers,
      timeseries: timeseriesOut
    };

    return res.json({ success: true, summary });
  } catch (err) {
    console.error("GET /api/analytics/summary error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;
