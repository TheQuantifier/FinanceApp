// api/index.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { ObjectId } = require("mongodb");
require("dotenv").config();

const { connectMongo, getDb } = require("./mongo");

const app = express();
app.use(cors());
app.use(express.json());

// --- Upload dir ---
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB while testing
});

function isAllowedFile(file) {
  const allowedMimes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/octet-stream"
  ]);
  if (allowedMimes.has(file.mimetype)) return true;
  const ext = path.extname(file.originalname).toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg"].includes(ext);
}

// --- Python resolver for OCR ---
const workerDir = path.resolve(__dirname, "../worker");
const macVenvPy = path.join(workerDir, ".venv", "bin", "python");
const winVenvPy = path.join(workerDir, ".venv", "Scripts", "python.exe");
const PYTHON = fs.existsSync(macVenvPy)
  ? macVenvPy
  : fs.existsSync(winVenvPy)
  ? winVenvPy
  : "python3";

function runOCR(absPath) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON, ["ocr_demo.py", absPath], { cwd: workerDir });
    let out = "", err = "";
    py.stdout.on("data", c => (out += c));
    py.stderr.on("data", c => (err += c));
    py.on("close", code => {
      if (code !== 0) return reject(new Error(err || "OCR failed"));
      try { resolve(JSON.parse(out)); }
      catch { resolve({ source: absPath, ocr_text: out }); }
    });
  });
}

// --- Simple routes ---
app.get("/", (_req, res) => res.send("Finance App API (Mongo) is running 🚀"));
app.get("/health", async (_req, res) => {
  try {
    getDb(); // ensure connected
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Browser form to test manual upload
app.get("/test", (_req, res) => res.send(`
  <form action="/upload" method="post" enctype="multipart/form-data">
    <input type="file" name="receipt" />
    <button>Upload</button>
  </form>
`));

// --- Upload: save file → OCR → store in Mongo ---
app.post("/upload", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!isAllowedFile(req.file)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: "Only PDF/PNG/JPG allowed" });
    }

    const db = getDb();
    const absPath = path.resolve(req.file.path);
    const ocr = await runOCR(absPath);

    // Build Mongo document for receipts
    const doc = {
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      path: absPath,
      mimetype: req.file.mimetype,
      size_bytes: req.file.size,
      uploaded_at: new Date().toISOString(),
      parse_status: "raw", // later: 'parsed'
      ocr_text: typeof ocr === "object" ? (ocr.ocr_text || JSON.stringify(ocr)) : String(ocr || ""),
      // room for parsed fields (later)
      merchant: null,
      date: null,
      currency: "USD",
      total_amount_cents: null
    };

    const result = await db.collection("receipts").insertOne(doc);

    // (Optional) also keep the sidecar JSON on disk for quick dev inspection
    const sidecar = absPath + ".json";
    try { fs.writeFileSync(sidecar, JSON.stringify({ _id: result.insertedId, ...doc }, null, 2)); } catch {}

    res.json({
      message: "File uploaded and OCR saved to Mongo.",
      receipt_id: String(result.insertedId),
      file: {
        name: req.file.originalname,
        storedName: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      ocr_text: doc.ocr_text
    });
  } catch (e) { next(e); }
});

// --- List receipts (recent first) ---
app.get("/receipts", async (_req, res, next) => {
  try {
    const db = getDb();
    const rows = await db.collection("receipts")
      .find({})
      .project({ ocr_text: 0 }) // hide large text by default
      .sort({ uploaded_at: -1 })
      .limit(100)
      .toArray();
    res.json(rows.map(r => ({ ...r, _id: String(r._id) })));
  } catch (e) { next(e); }
});

// --- Get a single receipt (with OCR text) ---
app.get("/receipts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const row = await db.collection("receipts").findOne({ _id: new ObjectId(req.params.id) });
    if (!row) return res.status(404).json({ error: "Not found" });
    row._id = String(row._id);
    res.json(row);
  } catch (e) { next(e); }
});

// --- Delete receipt (Mongo + disk file if present) ---
app.delete("/receipts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const row = await db.collection("receipts").findOne({ _id: new ObjectId(req.params.id) });
    if (!row) return res.status(404).json({ error: "Not found" });

    // delete physical files (best-effort)
    try { if (row.path && fs.existsSync(row.path)) fs.unlinkSync(row.path); } catch {}
    try { if (row.path && fs.existsSync(row.path + ".json")) fs.unlinkSync(row.path + ".json"); } catch {}

    await db.collection("receipts").deleteOne({ _id: new ObjectId(req.params.id) });
    // cascade transactions if you add them later
    await db.collection("transactions").deleteMany({ receipt_id: new ObjectId(req.params.id) });

    res.json({ deleted: req.params.id });
  } catch (e) { next(e); }
});

// --- Minimal error handler ---
app.use((err, _req, res, _next) => {
  const msg = err?.message || "Server error";
  const status = msg.includes("allowed") ? 400 : 500;
  console.error("!! error:", msg);
  res.status(status).json({ error: msg });
});

// --- Start server (connect Mongo first) ---
const port = Number(process.env.PORT || 4000);
connectMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port}`);
      console.log(`🧪 Using Python: ${PYTHON}`);
    });
  })
  .catch((e) => {
    console.error("❌ Failed to connect to Mongo:", e.message);
    process.exit(1);
  });
