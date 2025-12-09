// src/controllers/receipts.controller.js
const Receipt = require('../models/Receipt');
const asyncHandler = require('../middleware/async');
const { parseReceiptText } = require('../services/aiParser.service');
const Record = require('../models/Record');
const { parseDateOnly } = require('./records.controller'); // import helper


const {
  uploadBufferToGridFS,
  streamFromGridFS,
  deleteFromGridFS,
} = require('../lib/gridfs');

const { runOcrBuffer } = require('../services/ocr.service');

// ==========================================================
// POST /api/receipts/upload
// Upload -> GridFS -> OCR -> Save metadata
// ==========================================================
exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const buffer = req.file.buffer;

  // 1. Upload raw file → GridFS
  const fileId = await uploadBufferToGridFS(
    req.file.originalname,
    buffer,
    req.file.mimetype
  );

  // 2. OCR → text extraction
  let ocrText = '';
  try {
    const result = await runOcrBuffer(buffer);
    ocrText = result.text || '';
  } catch (err) {
    console.error('OCR failed:', err);
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
    parsedData: parsed || {}
  });

  // 5. Auto-create Record if AI found a total + date
  let linkedRecord = null;

  if (parsed && parsed.total && parsed.total > 0) {
    linkedRecord = await Record.create({
      user: req.user.id,
      type: "expense",
      amount: parsed.total,
      category: "Uncategorized",
      date: parseDateOnly(parsed.date) || new Date(),
      note: parsed.vendor || "Receipt",
      linkedReceiptId: receipt._id
    });

    // Update receipt to store link
    receipt.linkedRecordId = linkedRecord._id;
    await receipt.save();
  }

  res.status(201).json({
    receipt,
    autoRecord: linkedRecord
  });
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
    user: req.user.id,
  }).lean();

  if (!receipt) {
    return res.status(404).json({ message: 'Receipt not found' });
  }

  res.json(receipt);
});

// ==========================================================
// GET /api/receipts/:id/download
// Stream file from GridFS -> client
// ==========================================================
exports.download = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!receipt) {
    return res.status(404).json({ message: 'Receipt not found' });
  }

  res.set({
    'Content-Disposition': `attachment; filename="${receipt.originalFilename}"`,
    'Content-Type': 'application/octet-stream',
  });

  streamFromGridFS(receipt.storedFileId, res);
});

// ==========================================================
// DELETE /api/receipts/:id
// Delete metadata AND GridFS file
// ==========================================================
exports.remove = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!receipt) {
    return res.status(404).json({ message: 'Receipt not found' });
  }

  // 1. Delete file from GridFS
  await deleteFromGridFS(receipt.storedFileId);

  // 2. Delete metadata record
  await Receipt.deleteOne({ _id: receipt._id });

  res.json({ message: 'Receipt deleted successfully' });
});
