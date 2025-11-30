// src/lib/multer.js
const multer = require('multer');

// Use memory storage for GridFS uploads
const storage = multer.memoryStorage();

module.exports = multer({ storage });
