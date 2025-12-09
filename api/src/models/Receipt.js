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

    // Raw OCR text from the OCR worker
    ocrText: {
      type: String,
      default: "",
    },

    // Gemini-extracted structured data:
    // {
    //   vendor: "...",
    //   date: "YYYY-MM-DD",
    //   total: 12.34,
    //   tax: 0.98,
    //   items: [{ name, price }],
    //   paymentMethod: "Visa ****1234"
    // }
    parsedData: {
      type: Object,
      default: {},
    },

    // The auto-created financial record linked to this receipt
    linkedRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
