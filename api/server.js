// api/server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const authRouter = require("./auth");
require("dotenv").config();

const { connectMongo, getDb, getModels } = require("./mongo");
const recordsRouter = require("./records");
const { parseFile } = require("./utils/fileParser");

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use("/api/auth", authRouter);

// Upload directory (outside api/, sibling of this folder)
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory:", uploadDir);
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

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

// Optional OCR setup
const workerDir = path.resolve(process.cwd(), "worker");
const ocrScript = path.join(workerDir, "ocr_demo.py");
const OCR_ENABLED = (process.env.OCR_ENABLED || "false").toLowerCase() === "true";

function resolvePythonBin() {
  if (process.env.PYTHON_BIN && fs.existsSync(process.env.PYTHON_BIN)) return process.env.PYTHON_BIN;
  const winVenvPy = path.join(workerDir, ".venv", "Scripts", "python.exe");
  if (process.platform === "win32" && fs.existsSync(winVenvPy)) return winVenvPy;
  const nixVenvPy = path.join(workerDir, ".venv", "bin", "python");
  if (fs.existsSync(nixVenvPy)) return nixVenvPy;
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
    let out = "", err = "", crashed = false;
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

// ------------------ ROUTES ------------------
// Health check
app.get("/", (_req, res) => res.send("Finance Tracker API is live"));
app.get("/health", (_req, res) => {
  try {
    getDb();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Simple upload test form
app.get("/test", (_req, res) => res.send(`
  <form action="/upload" method="post" enctype="multipart/form-data">
    <input type="file" name="receipt" />
    <button>Upload</button>
  </form>
`));

// ------------------ Upload ------------------
// File upload
app.post("/upload", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!isAllowedFile(req.file)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Only PDF/PNG/JPG allowed" });
    }

    const absPath = path.resolve(req.file.path);

    // Run OCR (always)
    const ocr = await runOCR(absPath);

    // Parse file using your parser
    let parsedData = {};
    try {
      parsedData = await parseFile(absPath, req.file.mimetype, ocr.ocr_text) || {};
    } catch (e) {
      console.warn("File parsing failed:", e.message || e);
    }

    const { Receipt } = getModels();

    // Use parsed values if available; fallback to OCR text or defaults
    const doc = await Receipt.create({
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      path: absPath,
      mimetype: req.file.mimetype,
      size_bytes: req.file.size,
      uploaded_at: new Date(),
      parse_status: parsedData ? "parsed" : "raw",
      ocr_text: ocr.ocr_text || "",
      date: parsedData?.Date || null,
      source: parsedData?.Source || (ocr.ocr_text ? ocr.ocr_text.slice(0, 100) : null),
      category: parsedData?.Category || "other",
      amount: parsedData?.Amount ?? null,
      method: parsedData?.Method || null,
      notes: parsedData?.Notes || (ocr.ocr_text || ""),
      type: parsedData?.Type || "expense",
      currency: "USD"
    });
    res.json({ message: "File uploaded and parsed.", receipt: doc });
  } catch (err) {
    console.error("Upload error:", err);
    next(err);
  }
});

// ------------------ Receipts ------------------
// Get all receipts (cleaned to 6 fields)
// Get all receipts with structured fields + file info
// Get all receipts with parsed fields
app.get("/api/receipts", async (_req, res, next) => {
  try {
    const { Receipt } = getModels();
    const rows = await Receipt.find({})
      .sort({ uploaded_at: -1 })
      .limit(100)
      .lean();

    // Return full parsed financial fields
    const cleaned = rows.map(r => ({
      _id: String(r._id),
      date: r.date || null,
      source: r.source || null,
      category: r.category || null,
      amount: r.amount ?? null,
      method: r.method || null,
      notes: r.notes || null,
      parse_status: r.parse_status,
      uploaded_at: r.uploaded_at,
    }));
    res.json(cleaned);
  } catch (e) {
    console.error("Error fetching receipts:", e);
    next(e);
  }
});

// Get single receipt by ID (cleaned to 6 fields)
app.get("/api/receipts/:id", async (req, res, next) => {
  try {
    const { Receipt } = getModels();
    const r = await Receipt.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ error: "Not found" });

    res.json({
      _id: String(r._id),
      Date: r.date || null,
      Source: r.source || null,
      Category: r.category || null,
      Amount: r.amount || null,
      Method: r.method || null,
      Notes: r.notes || null
    });
  } catch (e) {
    next(e);
  }
});

// Delete receipt
app.delete("/api/receipts/:id", async (req, res, next) => {
  try {
    const { Receipt } = getModels();
    const r = await Receipt.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });

    try { if (r.path && fs.existsSync(r.path)) fs.unlinkSync(r.path); } catch {}
    await Receipt.findByIdAndDelete(req.params.id);

    res.json({ deleted: req.params.id });
  } catch (e) {
    next(e);
  }
});

// Mount records router
app.use("/api/records", recordsRouter);

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Error:", err?.message || err);
  res.status(500).json({ error: err?.message || "Server error" });
});

// ------------------ START SERVER ------------------
const port = Number(process.env.PORT || 4000);
connectMongo()
  .then(() => {
    app.listen(port, () => console.log(`API running at http://localhost:${port}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
