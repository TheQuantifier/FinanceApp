// src/controllers/receipts.controller.js
const Receipt = require("../models/Receipt");
const asyncHandler = require("../middleware/async");
const { parseReceiptText } = require("../services/aiParser.service");
const Record = require("../models/Record");
const { parseDateOnly } = require("./records.controller");

const {
  uploadBufferToGridFS,
  streamFromGridFS,
  deleteFromGridFS,
} = require("../lib/gridfs");

const { runOcrBuffer } = require("../services/ocr.service");

// ==========================================================
// POST /api/receipts/upload
// ==========================================================
exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("📦 Uploading receipt:", req.file.originalname);

  const buffer = req.file.buffer;

  // 1. Save file → GridFS
  const fileId = await uploadBufferToGridFS(
    req.file.originalname,
    buffer,
    req.file.mimetype
  );

  // 2. OCR
  let ocrText = "";
  try {
    const result = await runOcrBuffer(buffer);
    ocrText = result?.text || "";

    console.log("📄 OCR Result Preview:", ocrText.slice(0, 400));
  } catch (err) {
    console.error("❌ OCR failed:", err);
  }

  // 3. AI Parsing
  const parsed = await parseReceiptText(ocrText);

  // 4. Save receipt
  const receipt = await Receipt.create({
    user: req.user.id,
    originalFilename: req.file.originalname,
    storedFileId: fileId,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    ocrText,
    parsedData: parsed || {},
  });

  // 5. Auto-create Record if AI found useful fields
  let linkedRecord = null;

  if (parsed && parsed.total && parsed.total > 0) {
    console.log("🧾 Creating auto-record from AI data...");

    const recordDate =
      parseDateOnly(parsed.date) ||
      (() => {
        console.log("⚠️ AI date invalid — using current date instead.");
        return new Date();
      })();

    linkedRecord = await Record.create({
      user: req.user.id,
      type: "expense",
      amount: parsed.total,
      category: "Uncategorized",
      date: recordDate,
      note: parsed.vendor || "Receipt",
      linkedReceiptId: receipt._id,
    });

    console.log("✅ Auto-created record:", linkedRecord._id);

    receipt.linkedRecordId = linkedRecord._id;
    await receipt.save();
  } else {
    console.log("ℹ️ AI did not produce usable total — skipping auto-record.");
  }

  res.status(201).json({
    receipt,
    autoRecord: linkedRecord,
  });
});

// ==========================================================
// GET ALL RECEIPTS
// ==========================================================
exports.getAll = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.json(receipts);
});

// ==========================================================
// GET SINGLE RECEIPT
// ==========================================================
exports.getOne = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id,
  }).lean();

  if (!receipt) {
    return res.status(404).json({ message: "Receipt not found" });
  }

  res.json(receipt);
});

// ==========================================================
// DOWNLOAD ORIGINAL FILE
// ==========================================================
exports.download = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!receipt) {
    return res.status(404).json({ message: "Receipt not found" });
  }

  res.set({
    "Content-Disposition": `attachment; filename="${receipt.originalFilename}"`,
    "Content-Type": receipt.fileType || "application/octet-stream",
  });

  streamFromGridFS(receipt.storedFileId, res);
});

// ==========================================================
// DELETE RECEIPT + FILE
// ==========================================================
exports.remove = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!receipt) {
    return res.status(404).json({ message: "Receipt not found" });
  }

  // Delete GridFS file
  await deleteFromGridFS(receipt.storedFileId);

  // Delete metadata
  await Receipt.deleteOne({ _id: receipt._id });

  res.json({ message: "Receipt deleted successfully" });
});
