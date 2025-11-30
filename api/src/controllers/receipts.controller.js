// src/controllers/receipts.controller.js
const Receipt = require('../models/Receipt');
const asyncHandler = require('../middleware/async');

const {
  uploadBufferToGridFS,
  streamFromGridFS,
  deleteFromGridFS
} = require('../lib/gridfs');

const { runOcrBuffer } = require('../services/ocr.service');


// ==========================================================
// POST /api/receipts/upload
// Upload -> GridFS (user bucket) -> OCR -> Save metadata
// ==========================================================
exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const buffer = req.file.buffer;
  const userId = req.user.id;

  // 1. Upload to GridFS (per-user bucket)
  const fileId = await uploadBufferToGridFS(
    userId,                // NEW
    req.file.originalname,
    buffer,
    req.file.mimetype
  );

  // 2. OCR
  let ocrText = "";
  try {
    const result = await runOcrBuffer(buffer);
    ocrText = result.text || "";
  } catch (err) {
    console.error("OCR failed:", err);
  }

  // 3. Store metadata
  const receipt = await Receipt.create({
    user: userId,
    originalFilename: req.file.originalname,
    storedFileId: fileId,
    ocrText
  });

  res.status(201).json(receipt);
});


// ==========================================================
// GET /api/receipts
// All receipts for user
// ==========================================================
exports.getAll = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.json(receipts);
});


// ==========================================================
// GET /api/receipts/:id
// Single receipt for user
// ==========================================================
exports.getOne = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id
  }).lean();

  if (!receipt) {
    return res.status(404).json({ message: "Receipt not found" });
  }

  res.json(receipt);
});


// ==========================================================
// GET /api/receipts/:id/download
// Stream file from user's GridFS bucket -> client
// ==========================================================
exports.download = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!receipt) {
    return res.status(404).json({ message: "Receipt not found" });
  }

  res.set({
    "Content-Disposition": `attachment; filename="${receipt.originalFilename}"`,
    "Content-Type": "application/octet-stream"
  });

  streamFromGridFS(
    req.user.id,           // NEW
    receipt.storedFileId,
    res
  );
});


// ==========================================================
// DELETE /api/receipts/:id
// Delete metadata AND user-specific GridFS file
// ==========================================================
exports.remove = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!receipt) {
    return res.status(404).json({ message: "Receipt not found" });
  }

  // 1. Delete file from this user's bucket
  await deleteFromGridFS(
    req.user.id,           // NEW
    receipt.storedFileId
  );

  // 2. Delete metadata
  await Receipt.deleteOne({ _id: receipt._id });

  res.json({ message: "Receipt deleted successfully" });
});
