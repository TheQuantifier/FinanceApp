// src/controllers/records.controller.js
const Record = require('../models/Record');
const asyncHandler = require('../middleware/async');

// ==========================================================
// Helper — Parse YYYY-MM-DD into a UTC "noon" Date
// This prevents timezone shifts from showing the previous day
// ==========================================================
function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);

  // Store as 12:00 UTC so any negative timezone (like EST)
  // still sees the same calendar date.
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

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
    date: parseDateOnly(date) || new Date(), // stored as noon UTC
    note,
  });

  res.status(201).json(record);
});

// ==========================================================
// PUT /api/records/:id
// Update an existing record
// ==========================================================
exports.update = asyncHandler(async (req, res) => {
  const { type, amount, category, date, note } = req.body;

  // Validate required fields if they are provided
  if (type && !['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'Invalid record type' });
  }

  if (amount !== undefined && amount < 0) {
    return res.status(400).json({ message: 'Amount must be >= 0' });
  }

  // Find the record
  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!record) {
    return res.status(404).json({ message: 'Record not found' });
  }

  // Update allowed fields
  if (type !== undefined) record.type = type;
  if (amount !== undefined) record.amount = amount;
  if (category !== undefined) record.category = category;
  if (date !== undefined) record.date = parseDateOnly(date);
  if (note !== undefined) record.note = note;

  await record.save();

  res.json({ message: "Record updated", record });
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