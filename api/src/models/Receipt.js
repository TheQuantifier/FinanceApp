// src/models/Receipt.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    originalFilename: {
      type: String,
      required: true,
    },

    storedFilename: {
      type: String, // multer disk filename
      required: true,
    },

    ocrText: {
      type: String,
      default: '',
    },

    linkedRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);