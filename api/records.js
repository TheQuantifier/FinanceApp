// api/records.js
const express = require("express");
const router = express.Router();
const { getModels } = require("./mongo");

// GET /records
router.get("/", async (req, res) => {
  try {
    const { Record } = getModels();
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.method) query.method = req.query.method;

    const rows = await Record.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Return structured fields that match your MongoDB schema
    const cleaned = rows.map(r => ({
      _id: String(r._id),
      date: r.date || null,
      source: r.source || null,
      category: r.category || null,
      amount: r.amount || 0,
      method: r.method || null,
      notes: r.notes || null,
      currency: r.currency || "USD",
    }));

    res.json(cleaned);
  } catch (err) {
    console.error("Error fetching records:", err);
    res.status(500).json({ error: "Failed to load records" });
  }
});

// POST /records (optional — keep if needed)
router.post("/", async (req, res) => {
  try {
    const { Record } = getModels();
    const payload = req.body;

    if (!payload || !payload.date || typeof payload.amount !== "number") {
      return res.status(400).json({ error: "Missing required fields (date, amount)" });
    }

    const doc = await Record.create({
      date: payload.date,
      source: payload.source || "",
      category: payload.category || "",
      amount: payload.amount,
      method: payload.method || "",
      notes: payload.notes || "",
      currency: payload.currency || "USD",
    });

    res.status(201).json({
      _id: String(doc._id),
      date: doc.date,
      source: doc.source,
      category: doc.category,
      amount: doc.amount,
      method: doc.method,
      notes: doc.notes,
      currency: doc.currency,
    });
  } catch (err) {
    console.error("Error saving record:", err);
    res.status(500).json({ error: "Failed to save record" });
  }
});

module.exports = router;
