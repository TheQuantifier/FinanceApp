// src/models/Receipt.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    originalFilename: { type: String, required: true },

    storedFileId: { type: mongoose.Schema.Types.ObjectId, required: true },

    ocrText: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);