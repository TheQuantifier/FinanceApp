// src/models/Record.js
const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    // Owning user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // income | expense
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    // Dollar amount
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Category (user-entered or "Uncategorized")
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Always stored as UTC noon to avoid timezone shifting
    date: {
      type: Date,
      required: true,
      default: () => {
        const now = new Date();
        return new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          12, 0, 0
        ));
      },
    },

    // Optional text note
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // If auto-created from a receipt
    linkedReceiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// ========================================================
// Ensure date is never null by schema validation
// ========================================================
recordSchema.pre("validate", function (next) {
  if (!this.date || isNaN(this.date.getTime())) {
    return next(new Error("Record date is required and must be valid"));
  }
  next();
});

module.exports = mongoose.model("Record", recordSchema);
