const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
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

// --- Routes ---
app.get("/", (_req, res) => res.send("Finance App API is running 🚀"));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/receipts", async (_req, res, next) => {
  try {
    const names = await fsp.readdir(uploadDir);
    res.json({ files: names.map(name => ({ name })) });
  } catch (err) {
    next(err);
  }
});

app.post("/upload", upload.single("receipt"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({
    message: "File uploaded successfully!",
    file: {
      name: req.file.originalname,
      storedName: path.basename(req.file.filename),
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

const { spawn } = require("child_process");

app.post("/ocr/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);

  // Run the Python OCR script
  const py = spawn("python3", ["../worker/ocr_demo.py", filePath]);

  let data = "";
  let error = "";

  py.stdout.on("data", (chunk) => (data += chunk));
  py.stderr.on("data", (chunk) => (error += chunk));

  py.on("close", (code) => {
    if (code !== 0) return res.status(500).json({ error: error || "OCR failed" });

    try {
      const result = JSON.parse(data);
      res.json(result);
    } catch {
      res.status(200).json({ ocr_text: data });
    }
  });
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