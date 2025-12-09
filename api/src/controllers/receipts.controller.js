// src/controllers/receipts.controller.js
const Receipt = require("../models/Receipt");
const Record = require("../models/Record");
const asyncHandler = require("../middleware/async");
const { parseReceiptText } = require("../services/aiParser.service");
const { parseDateOnly } = require("./records.controller");

const {
  uploadBufferToGridFS,
  streamFromGridFS,
  deleteFromGridFS,
} = require("../lib/gridfs");

const { runOcrBuffer } = require("../services/ocr.service");


/* ============================================================
   POST /api/receipts/upload
   Upload → OCR → Gemini parsing → Save receipt → Auto-record
   ============================================================ */
exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("📦 Uploading receipt:", req.file.originalname);
  const buffer = req.file.buffer;

  // 1. Save raw file to GridFS
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
    console.log("📄 OCR Result (preview):", ocrText.slice(0, 250));
  } catch (err) {
    console.error("❌ OCR failed:", err);
  }

  // 3. AI parsing
  let parsed = null;
  if (ocrText.trim().length > 5) {
    console.log("🤖 Sending text to Gemini parser...");
    parsed = await parseReceiptText(ocrText);
  }

  console.log("🧠 Parsed:", parsed);

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

  // 5. Auto-create record (FIXED: uses parsed.amount, not parsed.total)
  let autoRecord = null;

  if (parsed && parsed.amount && parsed.amount > 0) {
    console.log("🧾 Creating auto-record...");

    const recordDate =
      parseDateOnly(parsed.date) ||
      (() => {
        console.log("⚠️ Invalid AI date — using today instead.");
        return new Date();
      })();

    autoRecord = await Record.create({
      user: req.user.id,
      type: "expense",
      amount: parsed.amount, // FIXED
      category: "Uncategorized",
      date: recordDate,
      note: parsed.source || "Receipt",
      linkedReceiptId: receipt._id,
    });

    receipt.linkedRecordId = autoRecord._id;
    await receipt.save();

    console.log("✅ Auto-record created:", autoRecord._id);
  } else {
    console.log("ℹ️ No usable amount found — skipping auto-record.");
  }

  res.status(201).json({
    receipt,
    autoRecord,
  });
});


/* ============================================================
   GET /api/receipts
   ============================================================ */
exports.getAll = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.json(receipts);
});


/* ============================================================
   GET /api/receipts/:id
   ============================================================ */
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


/* ============================================================
   DOWNLOAD original receipt file
   ============================================================ */
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


/* ============================================================
   DELETE receipt
   Query param: ?deleteRecord=true|false
   ============================================================ */
exports.remove = asyncHandler(async (req, res) => {
  const deleteRecord = req.query.deleteRecord === "true";

  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!receipt) {
    return res.status(404).json({ message: "Receipt not found" });
  }

  const linkedRecordId = receipt.linkedRecordId;

  // 1. Delete physical file
  await deleteFromGridFS(receipt.storedFileId);

  // 2. Delete receipt entry
  await Receipt.deleteOne({ _id: receipt._id });

  // 3. Delete or unlink associated record
  if (linkedRecordId) {
    if (deleteRecord) {
      await Record.deleteOne({ _id: linkedRecordId, user: req.user._id });
    } else {
      await Record.updateOne(
        { _id: linkedRecordId },
        { $set: { linkedReceiptId: null } }
      );
    }
  }

  res.json({
    message: "Receipt deleted",
    recordDeleted: deleteRecord,
  });
});
