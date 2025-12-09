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

    fileType: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    ocrText: {
      type: String,
      default: '',
    },

    // NEW — AI parsed results (vendor, date, total, items)
    parsedData: {
      type: Object,
      default: {},
    },

    // NEW — auto-created Record linked to this receipt
    linkedRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);
