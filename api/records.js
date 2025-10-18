// api/records.js
const express = require("express");
const router = express.Router();
const { getModels } = require("./mongo");

// GET /records
router.get("/", async (req, res) => {
  try {
    const { Record } = getModels();
    // Optional filters in future: ?type=expense&method=Credit%20Card
    const query = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.method) query.method = req.query.method;
    if (req.query.category) query.category = req.query.category;

    const rows = await Record.find(query).sort({ date: -1, createdAt: -1 }).lean();
    res.json(rows);
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

    // Quick validation (front-end should already enforce these)
    if (!payload || !payload.type || !payload.date || typeof payload.amount !== "number") {
      return res.status(400).json({ error: "Missing required fields (type, date, amount)" });
    }

    const doc = await Record.create({
      type: payload.type,
      date: payload.date, // 'YYYY-MM-DD'
      amount: payload.amount,
      method: payload.method || "",
      category: payload.category || "",
      notes: payload.notes || ""
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Error saving record:", err);
    res.status(500).json({ error: "Failed to save record" });
  }
});

module.exports = router;
