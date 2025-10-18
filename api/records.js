// api/records.js
const express = require("express");
const router = express.Router();
const { getModels } = require("./mongo");

// GET /records
router.get("/", async (req, res) => {
  try {
    const { Record } = getModels();
    const query = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.method) query.method = req.query.method;
    if (req.query.category) query.category = req.query.category;

    const rows = await Record.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Return only structured fields
    const cleaned = rows.map(r => ({
      _id: String(r._id),
      type: r.type,
      date: r.date,
      amount: r.amount,
      method: r.method || null,
      category: r.category || null,
      notes: r.notes || null
    }));

    res.json(cleaned);
  } catch (err) {
    console.error("Error fetching records:", err);
    res.status(500).json({ error: "Failed to load records" });
  }
});

// POST /records
router.post("/", async (req, res) => {
  try {
    const { Record } = getModels();
    const payload = req.body;

    if (!payload || !payload.type || !payload.date || typeof payload.amount !== "number") {
      return res.status(400).json({ error: "Missing required fields (type, date, amount)" });
    }

    const doc = await Record.create({
      type: payload.type,
      date: payload.date,
      amount: payload.amount,
      method: payload.method || "",
      category: payload.category || "",
      notes: payload.notes || ""
    });

    // Return only the structured fields
    res.status(201).json({
      _id: String(doc._id),
      type: doc.type,
      date: doc.date,
      amount: doc.amount,
      method: doc.method || null,
      category: doc.category || null,
      notes: doc.notes || null
    });
  } catch (err) {
    console.error("Error saving record:", err);
    res.status(500).json({ error: "Failed to save record" });
  }
});


module.exports = router;
