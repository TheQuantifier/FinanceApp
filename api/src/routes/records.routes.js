// src/routes/records.routes.js
const express = require('express');
const router = express.Router();

const controller = require('../controllers/records.controller');
const auth = require('../middleware/auth');

// --------------------------------------------------
// Get a single record
// --------------------------------------------------
router.get('/:id', auth, controller.getOne);

// --------------------------------------------------
// Get all records for logged-in user
// --------------------------------------------------
router.get('/', auth, controller.getAll);

// --------------------------------------------------
// Create a new record
// --------------------------------------------------
router.post('/', auth, controller.create);

// --------------------------------------------------
// Delete a record
// --------------------------------------------------
router.delete('/:id', auth, controller.remove);

module.exports = router;
