// src/controllers/receipts.controller.js
const Receipt = require('../models/Receipt');
const asyncHandler = require('../middleware/async');
const { runOcr } = require('../services/ocr.service');

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  // Run OCR through Python worker
  let ocrText = '';
  try {
    const result = await runOcr(req.file.path);
    ocrText = result.text || '';
  } catch (err) {
    console.error('OCR failed:', err.message);
  }

  const receipt = await Receipt.create({
    user: req.user.id,
    originalFilename: req.file.originalname,
    storedFilename: req.file.filename,
    ocrText,
  });

  res.status(201).json(receipt);
});

exports.getAll = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ user: req.user.id }).sort({
    createdAt: -1,
  });
  res.json(receipts);
});

exports.getOne = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!receipt) {
    return res.status(404).json({ message: 'Receipt not found' });
  }

  res.json(receipt);
});