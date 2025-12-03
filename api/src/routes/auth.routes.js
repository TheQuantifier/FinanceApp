const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// --------------------------------------------------
// PUBLIC ROUTES
// --------------------------------------------------
router.post('/register', controller.register);

// Login now expects: { identifier, password }
// Controller supports username OR email
router.post('/login', controller.login);

// --------------------------------------------------
// PROTECTED LOGOUT (requires auth)
// --------------------------------------------------
router.post('/logout', auth, controller.logout);

// --------------------------------------------------
// AUTHENTICATED USER ROUTES
// --------------------------------------------------
router.get('/me', auth, controller.me);
router.put('/me', auth, controller.updateMe);

// NEW: Change password for current user
// Body: { currentPassword, newPassword }
router.post('/change-password', auth, controller.changePassword);

// NEW: Delete current user account and all related data
router.delete('/me', auth, controller.deleteMe);

module.exports = router;