// src/routes/receipts.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/receipts.controller');
const auth = require('../middleware/auth');
const upload = require('../lib/multer');

router.post('/upload', auth, upload.single('file'), controller.upload);
router.get('/', auth, controller.getAll);
router.get('/:id', auth, controller.getOne);

module.exports = router;