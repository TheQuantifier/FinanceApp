// src/routes/index.js
const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/records', require('./records.routes'));
router.use('/receipts', require('./receipts.routes'));

module.exports = router;