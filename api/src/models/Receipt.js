// src/models/Receipt.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    originalFilename: {
      type: String,
      required: true,
    },

    storedFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // NEW: file MIME type, e.g. "application/pdf", "image/png"
    fileType: {
      type: String,
      default: "",
    },

    // NEW: size of original uploaded file in bytes
    fileSize: {
      type: Number,
      default: 0,
    },

    ocrText: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);
