// src/controllers/records.controller.js
const Record = require('../models/Record');
const asyncHandler = require('../middleware/async');

// ==========================================================
// GET /api/records/:id
// ==========================================================
exports.getOne = asyncHandler(async (req, res) => {
  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!record) {
    return res.status(404).json({ message: 'Record not found' });
  }

  res.json(record);
});

// ==========================================================
// GET /api/records
// ==========================================================
exports.getAll = asyncHandler(async (req, res) => {
  const records = await Record.find({ user: req.user.id })
    .sort({ date: -1 })
    .lean();

  res.json(records);
});

// ==========================================================
// POST /api/records
// ==========================================================
exports.create = asyncHandler(async (req, res) => {
  const { type, amount, category, date, note } = req.body;

  if (!type || !amount || !category) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const record = await Record.create({
    user: req.user.id,
    type,
    amount,
    category,
    date,
    note,
  });

  res.status(201).json(record);
});

// ==========================================================
// DELETE /api/records/:id
// ==========================================================
exports.remove = asyncHandler(async (req, res) => {
  const record = await Record.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!record) {
    return res.status(404).json({ message: 'Record not found' });
  }

  res.json({ message: 'Record deleted' });
});
