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
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });
  await _client.connect();
  _db = _client.db(dbName);

  // Create useful indexes for quick lookups
  await Promise.all([
    _db.collection("records").createIndex({ date: -1 }),
    _db.collection("records").createIndex({ type: 1 }),
    _db.collection("records").createIndex({ method: 1 }),
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
