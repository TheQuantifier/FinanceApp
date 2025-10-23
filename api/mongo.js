// api/mongo.js
const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "financeapp";

if (!uri) {
  console.error("❌ MONGODB_URI is not set in .env");
  process.exit(1);
}

// ======================= Schemas / Models =======================

// ---- Record Schema ----
const RecordSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["expense", "income"], required: true },
    date: { type: String, required: true },
    source: { type: String },
    amount: { type: Number, required: true },
    method: { type: String },
    category: { type: String },
    notes: { type: String },
    currency: { type: String, default: "USD" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Helpful indexes
RecordSchema.index({ date: -1 });
RecordSchema.index({ type: 1 });
RecordSchema.index({ method: 1 });

// ---- Receipt Schema ----
const ReceiptSchema = new mongoose.Schema(
  {
    original_filename: String,
    stored_filename: String,
    path: String,
    mimetype: String,
    size_bytes: Number,
    uploaded_at: Date,
    parse_status: String,
    ocr_text: String,
    date: String,
    source: String,
    category: String,
    amount: Number,
    method: String,
    notes: String,
    currency: { type: String, default: "USD" },
  },
  { timestamps: true }
);

ReceiptSchema.index({ uploaded_at: -1 });

// ---- User Schema ----
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);
// ======================= Mongo Connection =======================
let Models = {};
let connected = false;

async function connectMongo() {
  if (connected) return { db: mongoose.connection.db, Models };

  await mongoose.connect(uri, {
    dbName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  Models.Record = mongoose.models.Record || mongoose.model("Record", RecordSchema);
  Models.Receipt = mongoose.models.Receipt || mongoose.model("Receipt", ReceiptSchema);
  Models.user = mongoose.models.user || mongoose.model("user", userSchema);

  connected = true;
  console.log(`✅ Mongoose connected → db: ${dbName}`);

  return { db: mongoose.connection.db, Models };
}

function getDb() {
  if (!connected) throw new Error("Mongo not connected yet. Call connectMongo() first.");
  return mongoose.connection.db;
}

function getModels() {
  if (!connected) throw new Error("Mongo not connected yet. Call connectMongo() first.");
  return Models;
}

async function closeMongo() {
  try {
    await mongoose.connection.close();
  } catch (err) {
    console.error("Error closing MongoDB connection:", err);
  }
  connected = false;
}

module.exports = { connectMongo, getDb, getModels, closeMongo };
