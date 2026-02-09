// server/routes/userSuggestionRoutes.js
import express from "express";
import UserSuggestion from "../models/userSuggestion.js";

const router = express.Router();

// Helper function to get client info
const getClientInfo = (req) => ({
  ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
  userAgent: req.get('User-Agent') || 'Unknown'
});

/* ---------------------- SUBMIT USER SUGGESTION ---------------------- */
router.post("/", async (req, res) => {
  try {
    const { suggestion, category = 'other' } = req.body;
    
    if (!suggestion || !suggestion.trim()) {
      return res.status(400).json({
        success: false,
        message: "Suggestion is required"
      });
    }

    const clientInfo = getClientInfo(req);
    
    // Check if user already submitted this suggestion recently (within 24 hours)
    const recentSuggestion = await UserSuggestion.findOne({
      suggestion: suggestion.trim().toLowerCase(),
      user_ip: clientInfo.ip,
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (recentSuggestion) {
      return res.status(409).json({
        success: false,
        message: "You've already submitted this suggestion recently. Please wait 24 hours before submitting again."
      });
    }

    const userSuggestion = await UserSuggestion.create({
      suggestion: suggestion.trim(),
      category,
      user_ip: clientInfo.ip,
      user_agent: clientInfo.userAgent
    });

    return res.status(201).json({
      success: true,
      message: "Suggestion submitted successfully",
      data: {
        id: userSuggestion._id,
        suggestion: userSuggestion.suggestion,
        category: userSuggestion.category,
        status: userSuggestion.status
      }
    });
  } catch (err) {
    console.error("Submit suggestion error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to submit suggestion",
      error: err.message
    });
  }
});

/* ---------------------- GET POPULAR SUGGESTIONS ---------------------- */
router.get("/popular", async (req, res) => {
  try {
    const { limit = 10, category } = req.query;
    
    const query = { status: 'approved' };
    if (category && category !== 'all') {
      query.category = category;
    }

    const suggestions = await UserSuggestion.find(query)
      .sort({ votes: -1, created_at: -1 })
      .limit(parseInt(limit, 10) || 10)
      .select('suggestion category votes created_at')
      .exec();

    return res.json({
      success: true,
      data: suggestions,
      total: suggestions.length
    });
  } catch (err) {
    console.error("Get popular suggestions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch suggestions",
      error: err.message
    });
  }
});

/* ---------------------- GET SUGGESTIONS FOR SEARCH ---------------------- */
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || !q.trim()) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const searchTerm = q.trim();
    const suggestions = await UserSuggestion.find({
      status: 'approved',
      suggestion: { $regex: searchTerm, $options: 'i' }
    })
    .sort({ votes: -1, created_at: -1 })
    .limit(parseInt(limit, 10) || 5)
    .select('suggestion category votes')
    .exec();

    return res.json({
      success: true,
      data: suggestions,
      total: suggestions.length,
      query: searchTerm
    });
  } catch (err) {
    console.error("Search suggestions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to search suggestions",
      error: err.message
    });
  }
});

/* ---------------------- VOTE ON SUGGESTION ---------------------- */
router.post("/:id/vote", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'upvote' or 'downvote'
    
    if (!['upvote', 'downvote'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vote action. Use 'upvote' or 'downvote'"
      });
    }

    const clientInfo = getClientInfo(req);
    
    // Check if user already voted on this suggestion
    const existingVote = await UserSuggestion.findOne({
      _id: id,
      voters: clientInfo.ip
    });

    if (existingVote) {
      return res.status(409).json({
        success: false,
        message: "You've already voted on this suggestion"
      });
    }

    const voteIncrement = action === 'upvote' ? 1 : -1;
    
    const suggestion = await UserSuggestion.findByIdAndUpdate(
      id,
      { 
        $inc: { votes: voteIncrement },
        $addToSet: { voters: clientInfo.ip }
      },
      { new: true }
    );

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Suggestion not found"
      });
    }

    return res.json({
      success: true,
      message: `Suggestion ${action}d successfully`,
      data: {
        id: suggestion._id,
        votes: suggestion.votes
      }
    });
  } catch (err) {
    console.error("Vote suggestion error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to vote on suggestion",
      error: err.message
    });
  }
});

/* ---------------------- ADMIN: GET ALL SUGGESTIONS ---------------------- */
router.get("/admin/all", async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const suggestions = await UserSuggestion.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select('-user_ip -user_agent')
      .exec();

    const total = await UserSuggestion.countDocuments(query);

    return res.json({
      success: true,
      data: suggestions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error("Get all suggestions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch suggestions",
      error: err.message
    });
  }
});

/* ---------------------- ADMIN: UPDATE SUGGESTION STATUS ---------------------- */
router.put("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'pending', 'approved', or 'rejected'"
      });
    }

    const suggestion = await UserSuggestion.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select('-user_ip -user_agent');

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Suggestion not found"
      });
    }

    return res.json({
      success: true,
      message: "Suggestion status updated",
      data: suggestion
    });
  } catch (err) {
    console.error("Update suggestion status error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update suggestion",
      error: err.message
    });
  }
});

export default router;
