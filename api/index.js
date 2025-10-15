const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Upload dir (resolve robustly) ---
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Multer storage (no fileFilter here) ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

// Main uploader: allow upload, validate later
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB while testing
});

// Utility: post-save validation (MIME or extension)
function isAllowedFile(file) {
  const allowedMimes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/octet-stream" // some tools send this
  ]);
  if (allowedMimes.has(file.mimetype)) return true;
  const ext = path.extname(file.originalname).toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg"].includes(ext);
}

// --- Choose Python interpreter (prefer worker venv) ---
const workerDir = path.resolve(__dirname, "../worker");
const macVenvPy = path.join(workerDir, ".venv", "bin", "python");
const winVenvPy = path.join(workerDir, ".venv", "Scripts", "python.exe");
const PYTHON = fs.existsSync(macVenvPy)
  ? macVenvPy
  : fs.existsSync(winVenvPy)
  ? winVenvPy
  : "python3";

// --- OCR helper ---
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

// --- Routes ---
app.get("/", (_req, res) => res.send("Finance App API is running 🚀"));
app.get("/health", (_req, res) => res.json({ ok: true }));

// Simple browser form to test uploads
app.get("/test", (_req, res) => res.send(`
  <form action="/upload" method="post" enctype="multipart/form-data">
    <input type="file" name="receipt" />
    <button>Upload</button>
  </form>
`));

app.get("/receipts", async (_req, res, next) => {
  try {
    const names = await fsp.readdir(uploadDir);
    res.json({
      files: names.filter(n => !n.endsWith(".json")).map(name => ({ name }))
    });
  } catch (err) { next(err); }
});

// Upload -> validate -> auto OCR -> save sidecar JSON
app.post("/upload", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    if (!isAllowedFile(req.file)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: "Only PDF/PNG/JPG allowed" });
    }

    const absPath = path.resolve(req.file.path);
    const ocr = await runOCR(absPath);
    const sidecar = absPath + ".json";
    fs.writeFileSync(sidecar, JSON.stringify(ocr, null, 2));

    res.json({
      message: "File uploaded and OCR complete!",
      file: {
        name: req.file.originalname,
        storedName: path.basename(req.file.filename),
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      ocr_saved_as: path.basename(sidecar)
    });
  } catch (e) { next(e); }
});

// Diagnostic: accept ANY file field name (kept for troubleshooting)
app.post("/upload-any", multer({ storage }).any(), (req, res) => {
  res.json({ files: req.files?.map(f => f.originalname) || [] });
});

// Manual OCR trigger (uses the venv Python + worker cwd)
app.post("/ocr/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  const py = spawn(PYTHON, ["ocr_demo.py", filePath], { cwd: workerDir });
  let data = "", error = "";
  py.stdout.on("data", (chunk) => (data += chunk));
  py.stderr.on("data", (chunk) => (error += chunk));
  py.on("close", (code) => {
    if (code !== 0) return res.status(500).json({ error: error || "OCR failed" });
    try { res.json(JSON.parse(data)); }
    catch { res.status(200).json({ ocr_text: data }); }
  });
});

// Fetch saved OCR JSON for a file
app.get("/receipts/:storedName/ocr", (req, res, next) => {
  try {
    const p = path.join(uploadDir, req.params.storedName);
    const jsonP = p + ".json";
    if (!fs.existsSync(jsonP)) return res.status(404).json({ error: "OCR not found" });
    const data = JSON.parse(fs.readFileSync(jsonP, "utf8"));
    res.json(data);
  } catch (e) { next(e); }
});

// Delete a receipt and its OCR sidecar
app.delete("/receipts/:storedName", (req, res, next) => {
  try {
    const p = path.join(uploadDir, req.params.storedName);
    const j = p + ".json";
    if (fs.existsSync(p)) fs.unlinkSync(p);
    if (fs.existsSync(j)) fs.unlinkSync(j);
    res.json({ deleted: req.params.storedName });
  } catch (e) { next(e); }
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  const msg = err?.message || "Server error";
  const status = msg.includes("allowed") ? 400 : 500;
  console.error("!! error:", msg);
  res.status(status).json({ error: msg });
});

// --- Start server ---
const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`🧪 Using Python: ${PYTHON}`);
});