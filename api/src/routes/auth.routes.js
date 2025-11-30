// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// --------------------------------------------------
// PUBLIC ROUTES
// --------------------------------------------------
router.post('/register', controller.register);
router.post('/login', controller.login);

// --------------------------------------------------
// PROTECTED LOGOUT (prevents CSRF via cookie deletion)
// --------------------------------------------------
router.post('/logout', auth, controller.logout);

// --------------------------------------------------
// AUTHENTICATED USER ROUTES
// --------------------------------------------------
router.get('/me', auth, controller.me);
router.put('/me', auth, controller.updateMe);

module.exports = router;
