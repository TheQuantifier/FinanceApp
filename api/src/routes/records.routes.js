// src/routes/records.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/records.controller');
const auth = require('../middleware/auth');

router.get('/', auth, controller.getAll);
router.post('/', auth, controller.create);
router.delete('/:id', auth, controller.remove);

module.exports = router;