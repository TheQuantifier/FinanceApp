// src/controllers/receipts.controller.js
const Receipt = require('../models/Receipt');
const asyncHandler = require('../middleware/async');
const { uploadBufferToGridFS } = require('../lib/gridfs');
const { runOcrBuffer } = require('../services/ocr.service');

// POST /api/receipts/upload
// Upload a receipt file (buffer), store in GridFS, OCR it, save metadata
exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const buffer = req.file.buffer;

  // 1) Upload file to GridFS
  const fileId = await uploadBufferToGridFS(
    req.file.originalname,
    buffer,
    req.file.mimetype
  );

  // 2) Run OCR on the buffer
  let ocrText = '';
  try {
    const result = await runOcrBuffer(buffer);
    ocrText = result.text || '';
  } catch (err) {
    console.error('OCR failed:', err);
  }

  // 3) Save receipt document
  const receipt = await Receipt.create({
    user: req.user.id,
    originalFilename: req.file.originalname,
    storedFileId: fileId,
    ocrText,
  });

  res.status(201).json(receipt);
});

// GET /api/receipts
// Get all receipts for the current user
exports.getAll = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.json(receipts);
});

// GET /api/receipts/:id
// Get a single receipt for the current user
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

const { streamFromGridFS } = require('../lib/gridfs');

// GET /api/receipts/:id/download
exports.download = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!receipt) {
    return res.status(404).json({ message: 'Receipt not found' });
  }

  // Set headers so browser downloads instead of displaying raw data
  res.set({
    'Content-Disposition': `attachment; filename="${receipt.originalFilename}"`,
    'Content-Type': 'application/octet-stream',
  });

  // Stream the file straight from GridFS to the client
  streamFromGridFS(receipt.storedFileId, res);
});