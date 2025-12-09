// src/models/Record.js
const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    note: {
      type: String,
      trim: true,
    },

    linkedReceiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Record', recordSchema);
