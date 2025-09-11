// server/models/userSuggestion.js
import mongoose from "mongoose";

const userSuggestionSchema = new mongoose.Schema({
  suggestion: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['product_name', 'category', 'brand', 'color', 'size', 'other'],
    default: 'other'
  },
  user_ip: {
    type: String,
    required: true
  },
  user_agent: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  votes: {
    type: Number,
    default: 0
  },
  voters: [{
    type: String // Store IP addresses of users who voted
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient searching
userSuggestionSchema.index({ suggestion: 'text', category: 1, status: 1 });
userSuggestionSchema.index({ created_at: -1 });

// Update the updated_at field before saving
userSuggestionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const UserSuggestion = mongoose.model('UserSuggestion', userSuggestionSchema);

export default UserSuggestion;
