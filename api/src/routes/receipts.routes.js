// src/routes/receipts.routes.js
const express = require('express');
const router = express.Router();

const controller = require('../controllers/receipts.controller');
const auth = require('../middleware/auth');
const upload = require('../lib/multer');

// Upload a receipt
router.post('/upload', auth, upload.single('file'), controller.upload);

// Get all receipts for the logged-in user
router.get('/', auth, controller.getAll);

// Get a single receipt
router.get('/:id', auth, controller.getOne);

// Download the raw file from GridFS
router.get('/:id/download', auth, controller.download);

// Delete receipt + associated GridFS file
router.delete('/:id', auth, controller.remove);

module.exports = router;