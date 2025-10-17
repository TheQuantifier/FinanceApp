// api/mongo.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "financeapp";

if (!uri) {
  console.error("❌ MONGODB_URI is not set in .env");
  process.exit(1);
}

let _client = null;
let _db = null;

async function connectMongo() {
  if (_db) return _db;
  _client = new MongoClient(uri, {
    // sensible defaults
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });
  await _client.connect();
  _db = _client.db(dbName);

  // Ensure basic indexes (idempotent)
  await Promise.all([
    _db.collection("receipts").createIndex({ uploaded_at: -1 }),
    _db.collection("receipts").createIndex({ parse_status: 1 }),
    _db.collection("transactions").createIndex({ date: 1 }),
    _db.collection("transactions").createIndex({ category: 1 }),
    _db.collection("transactions").createIndex({ receipt_id: 1 }),
  ]);

  console.log(`✅ Mongo connected → db: ${dbName}`);
  return _db;
}

function getDb() {
  if (!_db) throw new Error("Mongo not connected yet. Call connectMongo() first.");
  return _db;
}

async function closeMongo() {
  try {
    await _client?.close();
  } catch {}
  _client = null;
  _db = null;
}

module.exports = { connectMongo, getDb, closeMongo };
