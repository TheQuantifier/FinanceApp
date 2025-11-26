// src/lib/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadTmpDir } = require('../config/env');

const dir = path.join(process.cwd(), 'api', uploadTmpDir);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  },
});

module.exports = multer({ storage });