// src/lib/multer.js
const multer = require('multer');

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

module.exports = multer({ storage });