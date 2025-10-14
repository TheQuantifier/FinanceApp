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

// --- Multer config: limits + type filter ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_"); // rudimentary sanitize
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const okTypes = ["application/pdf", "image/png", "image/jpeg"];
    cb(okTypes.includes(file.mimetype) ? null : new Error("Only PDF/PNG/JPG allowed"));
  }
});

// --- helpers ---
function runOCR(absPath) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", ["../worker/ocr_demo.py", absPath]);
    let out = "", err = "";
    py.stdout.on("data", c => (out += c));
    py.stderr.on("data", c => (err += c));
    py.on("close", code => {
      if (code !== 0) return reject(new Error(err || "OCR failed"));
      try { resolve(JSON.parse(out)); }
      catch { resolve({ source: absPath, ocr_text: out }); } // raw fallback
    });
  });
}

// --- Routes ---
app.get("/", (_req, res) => res.send("Finance App API is running 🚀"));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/receipts", async (_req, res, next) => {
  try {
    const names = await fsp.readdir(uploadDir);
    res.json({ files: names
      .filter(n => !n.endsWith(".json"))
      .map(name => ({ name })) });
  } catch (err) { next(err); }
});

// Upload -> auto OCR -> save sidecar JSON
app.post("/upload", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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

// Manual OCR trigger (kept for convenience)
app.post("/ocr/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  const py = spawn("python3", ["../worker/ocr_demo.py", filePath]);

  let data = "";
  let error = "";

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

// --- Error handler (including Multer errors) ---
app.use((err, _req, res, _next) => {
  const msg = err?.message || "Server error";
  const status = msg.includes("allowed") ? 400 : 500;
  res.status(status).json({ error: msg });
});

// --- Start server ---
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`✅ Server running on http://localhost:${port}`));