const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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

    // Raw OCR text from Google's OCR pipeline
    ocrText: {
      type: String,
      default: "",
    },

    // -------------------------------
    // NEW — Final structured fields
    // -------------------------------

    // Date of purchase (from receipt)
    date: {
      type: Date,
      default: null,
    },

    // Auto filled date when added to system
    dateAdded: {
      type: Date,
      default: () => new Date(),
    },

    // Store, venue, location, vendor name
    source: {
      type: String,
      default: "",
      trim: true,
    },

    // Amount before tax
    subAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total after tax
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tax amount
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Payment method
    payMethod: {
      type: String,
      enum: [
        "Cash",
        "Check",
        "Credit Card",
        "Debit Card",
        "Gift Card",
        "Multiple",
        "Other",
      ],
      default: "Other",
    },

    // Itemized list: [{ name, price }]
    items: {
      type: [
        {
          name: { type: String, trim: true },
          price: { type: Number, min: 0 },
        },
      ],
      default: [],
    },

    // Raw gemini output (useful for debugging)
    parsedData: {
      type: Object,
      default: {},
    },

    // Auto-linked Record ID
    linkedRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
