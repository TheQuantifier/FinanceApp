// api/server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { ObjectId } = require("mongodb");
require("dotenv").config();

const { connectMongo, getDb } = require("./mongo");

const app = express();
app.use(cors());
app.use(express.json());

// --- Upload directory setup ---
const uploadDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📂 Created uploads directory:", uploadDir);
}

// --- Multer file storage ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// --- Allowed file types ---
function isAllowedFile(file) {
  const allowedMimes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/octet-stream",
  ]);
  if (allowedMimes.has(file.mimetype)) return true;
  const ext = path.extname(file.originalname).toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg"].includes(ext);
}

// --- OCR setup (optional Python) ---
const workerDir = path.resolve(__dirname, "../worker");
const macVenvPy = path.join(workerDir, ".venv", "bin", "python");
const winVenvPy = path.join(workerDir, ".venv", "Scripts", "python.exe");
const PYTHON = fs.existsSync(macVenvPy)
  ? macVenvPy
  : fs.existsSync(winVenvPy)
  ? winVenvPy
  : "python3";

function runOCR(absPath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(workerDir)) {
      console.warn("⚠️ No worker directory found. Skipping OCR.");
      return resolve({ source: absPath, ocr_text: "OCR skipped." });
    }

    const py = spawn(PYTHON, ["ocr_demo.py", absPath], { cwd: workerDir });
    let out = "",
      err = "";
    py.stdout.on("data", (c) => (out += c));
    py.stderr.on("data", (c) => (err += c));
    py.on("close", (code) => {
      if (code !== 0) return resolve({ source: absPath, ocr_text: "OCR failed." });
      try {
        resolve(JSON.parse(out));
      } catch {
        resolve({ source: absPath, ocr_text: out });
      }
    });
  });
}

// --- Routes ---
app.get("/", (_req, res) => res.send("🚀 Finance Tracker API is live"));
app.get("/health", (_req, res) => {
  try {
    getDb();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// --- Upload receipt route ---
app.post("/upload", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!isAllowedFile(req.file)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Only PDF/PNG/JPG allowed" });
    }

    const db = getDb();
    const absPath = path.resolve(req.file.path);
    const ocr = await runOCR(absPath);

    const doc = {
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      path: absPath,
      mimetype: req.file.mimetype,
      size_bytes: req.file.size,
      uploaded_at: new Date(),
      parse_status: "raw",
      ocr_text:
        typeof ocr === "object"
          ? ocr.ocr_text || JSON.stringify(ocr)
          : String(ocr || ""),
      merchant: null,
      date: null,
      currency: "USD",
      total_amount_cents: null,
    };

    const result = await db.collection("receipts").insertOne(doc);
    res.json({
      message: "✅ File uploaded and stored in MongoDB.",
      receipt_id: result.insertedId,
      file: {
        name: req.file.originalname,
        storedName: req.file.filename,
      },
    });
  } catch (e) {
    next(e);
  }
});

// --- Get all receipts ---
app.get("/receipts", async (_req, res, next) => {
  try {
    const db = getDb();
    const receipts = await db
      .collection("receipts")
      .find({})
      .project({ ocr_text: 0 })
      .sort({ uploaded_at: -1 })
      .limit(100)
      .toArray();
    res.json(receipts.map((r) => ({ ...r, _id: String(r._id) })));
  } catch (e) {
    next(e);
  }
});

// --- Get single receipt ---
app.get("/receipts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const row = await db
      .collection("receipts")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!row) return res.status(404).json({ error: "Not found" });
    row._id = String(row._id);
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// --- Delete a receipt ---
app.delete("/receipts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const id = new ObjectId(req.params.id);
    await db.collection("receipts").deleteOne({ _id: id });
    await db.collection("transactions").deleteMany({ receipt_id: id });
    res.json({ deleted: req.params.id });
  } catch (e) {
    next(e);
  }
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ error: err.message });
});

// --- Start server ---
const port = process.env.PORT || 4000;
connectMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ API running → http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
