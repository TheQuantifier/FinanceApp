// api/records.js
const express = require("express");
const router = express.Router();
const { getDb } = require("./mongo");

// GET all records
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const records = await db.collection("records").find({}).toArray();
    res.json(records);
  } catch (err) {
    console.error("Error fetching records:", err);
    res.status(500).json({ error: "Failed to load records" });
  }
});

// POST new record
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const record = req.body;
    record.createdAt = new Date();
    const result = await db.collection("records").insertOne(record);
    res.status(201).json(result);
  } catch (err) {
    console.error("Error saving record:", err);
    res.status(500).json({ error: "Failed to save record" });
  }
});

module.exports = router;
