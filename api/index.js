const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Set up upload storage ---
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// --- Routes ---
app.get("/", (_req, res) => res.send("Finance App API is running 🚀"));

app.post("/upload", upload.single("receipt"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({
    message: "File uploaded successfully!",
    file: {
      name: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    },
  });
});

// --- Start server ---
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));