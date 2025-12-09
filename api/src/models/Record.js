const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    // The owning user
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

    // Dollar amount for the transaction
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

    // Stored as UTC NOON (via parseDateOnly) to prevent timezone issues
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Optional note/description
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // Link to a Receipt if this record was auto-created from OCR/AI
    linkedReceiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Record", recordSchema);
