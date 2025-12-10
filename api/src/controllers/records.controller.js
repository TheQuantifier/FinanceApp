// src/controllers/records.controller.js
const Record = require("../models/Record");
const Receipt = require("../models/Receipt");
const asyncHandler = require("../middleware/async");
const { deleteFromGridFS } = require("../lib/gridfs");

// ==========================================================
// Helper: Parse YYYY-MM-DD into a stable UTC-noon Date
// Prevents timezone shifting issues
// ==========================================================
function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}
exports.parseDateOnly = parseDateOnly;


// ==========================================================
// GET /api/records/:id
// ==========================================================
exports.getOne = asyncHandler(async (req, res) => {
  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!record) {
    return res.status(404).json({ message: "Record not found" });
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
    return res
      .status(400)
      .json({ message: "Missing required fields: type, amount, category" });
  }

  const record = await Record.create({
    user: req.user.id,
    type,
    amount,
    category,
    date: parseDateOnly(date) || new Date(),
    note,
    linkedReceiptId: null,
  });

  res.status(201).json(record);
});

// ==========================================================
// PUT /api/records/:id
// FULL EDIT SUPPORT (even for receipt-linked records)
// ==========================================================
exports.update = asyncHandler(async (req, res) => {
  const { type, amount, category, date, note } = req.body;

  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!record) {
    return res.status(404).json({ message: "Record not found" });
  }

  // Validation
  if (type && !["income", "expense"].includes(type)) {
    return res.status(400).json({ message: "Invalid type" });
  }
  if (amount !== undefined && amount < 0) {
    return res.status(400).json({ message: "Amount must be ≥ 0" });
  }

  // Apply updates
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
// Supports optional deletion of linked receipt
// deleteReceipt=true|false
// ==========================================================
exports.remove = asyncHandler(async (req, res) => {
  const deleteReceipt = req.query.deleteReceipt === "true";

  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!record) {
    return res.status(404).json({ message: "Record not found" });
  }

  const linkedReceiptId = record.linkedReceiptId;

  // 1. Delete the record itself
  await Record.deleteOne({ _id: record._id });

  // 2. Handle linked receipt logic
  if (linkedReceiptId) {
    const receipt = await Receipt.findOne({
      _id: linkedReceiptId,
      user: req.user.id,
    });

    if (receipt) {
      if (deleteReceipt) {
        // Delete receipt + gridfs file
        await Receipt.deleteOne({ _id: linkedReceiptId });
        await deleteFromGridFS(receipt.storedFileId);
      } else {
        // Keep receipt but unlink
        await Receipt.updateOne(
          { _id: linkedReceiptId },
          { $set: { linkedRecordId: null } }
        );
      }
    }
  }

  res.json({
    message: "Record deleted",
    deletedReceipt: deleteReceipt,
  });
});
