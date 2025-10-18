// api/server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
require("dotenv").config();

const { connectMongo, getDb, getModels } = require("./mongo");
const recordsRouter = require("./records");

const app = express();
app.use(cors());
app.use(express.json());

// ===== Upload directory (root-level, sibling of .env) =====
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📂 Created uploads directory:", uploadDir);
}

// ===== Multer storage =====
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Allow-list for files
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

/* =======================================================================
   Optional OCR (Python worker)
   - Enable by setting OCR_ENABLED=true in .env
   - Optionally set PYTHON_BIN to an explicit interpreter path
   - Gracefully skips if missing or errors (no crashes)
   ======================================================================= */
const workerDir = path.resolve(process.cwd(), "worker");
const ocrScript = path.join(workerDir, "ocr_demo.py");
const OCR_ENABLED = (process.env.OCR_ENABLED || "false").toLowerCase() === "true";

function resolvePythonBin() {
  // Highest priority: explicit env override
  if (process.env.PYTHON_BIN && fs.existsSync(process.env.PYTHON_BIN)) return process.env.PYTHON_BIN;

  // Windows venv
  const winVenvPy = path.join(workerDir, ".venv", "Scripts", "python.exe");
  if (process.platform === "win32" && fs.existsSync(winVenvPy)) return winVenvPy;

  // *nix venv
  const nixVenvPy = path.join(workerDir, ".venv", "bin", "python");
  if (fs.existsSync(nixVenvPy)) return nixVenvPy;

  // Fallbacks
  return process.platform === "win32" ? "python" : "python3";
}

async function runOCR(absPath) {
  if (!OCR_ENABLED) {
    return { source: absPath, ocr_text: "OCR disabled (set OCR_ENABLED=true to enable)." };
  }
  if (!fs.existsSync(workerDir) || !fs.existsSync(ocrScript)) {
    return { source: absPath, ocr_text: "OCR skipped (worker/ocr_demo.py not found)." };
  }

  const PYTHON = resolvePythonBin();

  return new Promise((resolve) => {
    let out = "", err = "";
    let crashed = false;

    const py = spawn(PYTHON, [ocrScript, absPath], { cwd: workerDir });

    py.on("error", (e) => {
      crashed = true;
      resolve({ source: absPath, ocr_text: `OCR error: ${e.message}.` });
    });

    py.stdout.on("data", (c) => (out += c));
    py.stderr.on("data", (c) => (err += c));

    py.on("close", (code) => {
      if (crashed) return;
      if (code !== 0) {
        return resolve({ source: absPath, ocr_text: `OCR failed (exit ${code}): ${err || "no stderr"}` });
      }
      try {
        const parsed = JSON.parse(out);
        return resolve({ source: absPath, ocr_text: parsed.ocr_text || out });
      } catch {
        return resolve({ source: absPath, ocr_text: out });
      }
    });
  });
}

// ===== Routes =====
app.get("/", (_req, res) => res.send("🚀 Finance Tracker API is live"));

app.get("/health", (_req, res) => {
  try {
    getDb(); // Ensure a DB is attached
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Quick manual upload test form (optional)
app.get("/test", (_req, res) => res.send(`
  <form action="/upload" method="post" enctype="multipart/form-data">
    <input type="file" name="receipt" />
    <button>Upload</button>
  </form>
`));

// Upload route → save file → (optional OCR) → store via Mongoose
app.post("/upload", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!isAllowedFile(req.file)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: "Only PDF/PNG/JPG allowed" });
    }

    const absPath = path.resolve(req.file.path);
    const ocr = await runOCR(absPath);

    const { Receipt } = getModels();
    const doc = await Receipt.create({
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      path: absPath,
      mimetype: req.file.mimetype,
      size_bytes: req.file.size,
      uploaded_at: new Date(),
      parse_status: "raw",
      ocr_text: typeof ocr === "object"
        ? (ocr.ocr_text || JSON.stringify(ocr))
        : String(ocr || ""),
      merchant: null,
      date: null,
      currency: "USD",
      total_amount_cents: null,
    });

    res.json({
      message: "✅ File uploaded and stored in MongoDB.",
      receipt_id: String(doc._id),
      file: { name: req.file.originalname, storedName: req.file.filename },
    });
  } catch (e) {
    next(e);
  }
});

// List receipts (recent first, omit OCR text by default) — using Mongoose
app.get("/receipts", async (_req, res, next) => {
  try {
    const { Receipt } = getModels();
    const rows = await Receipt.find({})
      .select("-ocr_text")
      .sort({ uploaded_at: -1 })
      .limit(100)
      .lean();

    // Normalize _id to string
    res.json(rows.map(r => ({ ...r, _id: String(r._id) })));
  } catch (e) {
    next(e);
  }
});

// Get a single receipt (includes OCR text) — using Mongoose
app.get("/receipts/:id", async (req, res, next) => {
  try {
    const { Receipt } = getModels();
    const row = await Receipt.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ error: "Not found" });
    row._id = String(row._id);
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// Delete a receipt and try to delete the file — using Mongoose
app.delete("/receipts/:id", async (req, res, next) => {
  try {
    const { Receipt } = getModels();
    const row = await Receipt.findById(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });

    // Best-effort delete of disk file
    try { if (row.path && fs.existsSync(row.path)) fs.unlinkSync(row.path); } catch {}

    await Receipt.findByIdAndDelete(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (e) {
    next(e);
  }
});

// Mount records router (JSON CRUD for user-entered txns)
app.use("/records", recordsRouter);

// Error handler
app.use((err, _req, res, _next) => {
  console.error("❌ Error:", err?.message || err);
  res.status(500).json({ error: err?.message || "Server error" });
});

// Start server
const port = Number(process.env.PORT || 4000);
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
