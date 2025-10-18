// api/mongo.js
const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "financeapp";

if (!uri) {
  console.error("❌ MONGODB_URI is not set in .env");
  process.exit(1);
}

// ----- Schemas / Models -----
const RecordSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["expense", "income"], required: true },
    date: { type: String, required: true }, // keep ISO yyyy-mm-dd from UI; convert later if you prefer Date
    amount: { type: Number, required: true },
    method: { type: String },
    category: { type: String },
    notes: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Helpful indexes
RecordSchema.index({ date: -1 });
RecordSchema.index({ type: 1 });
RecordSchema.index({ method: 1 });

const ReceiptSchema = new mongoose.Schema(
  {
    original_filename: String,
    stored_filename: String,
    path: String,
    mimetype: String,
    size_bytes: Number,
    uploaded_at: { type: Date, default: () => new Date() },
    parse_status: { type: String, default: "raw" },
    ocr_text: String,
    merchant: String,
    date: String,
    currency: { type: String, default: "USD" },
    total_amount_cents: Number
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

ReceiptSchema.index({ uploaded_at: -1 });

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
  } catch {}
  connected = false;
}

module.exports = { connectMongo, getDb, getModels, closeMongo };
