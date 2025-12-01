// src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function createToken(id) {
  return jwt.sign({ id }, jwtSecret, { expiresIn: jwtExpiresIn });
}

/**
 * Set JWT cookie with correct cross-site settings (Render + GitHub Pages)
 */
function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,        // REQUIRED on Render (HTTPS)
    sameSite: 'none',    // REQUIRED for cross-origin cookies
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// =====================================================
// REGISTER (unchanged for input, enhanced internally)
// =====================================================
exports.register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  // Auto-generate new fields
  const usernameBase = email.split('@')[0].toLowerCase();

  const user = await User.create({
    email,
    password,
    name,                   // OLD FIELD (still used)
    
    // New required fields
    username: usernameBase,
    fullName: name,         // map to fullName
    location: "",
    role: "user",
    phoneNumber: "",
    bio: "",
  });

  const token = createToken(user._id);
  setTokenCookie(res, token);

  res.status(201).json({ user });
});

// =====================================================
// LOGIN (email OR username allowed)
// =====================================================
exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Missing identifier or password' });
  }

  // identifier may be email OR username
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() }
    ]
  });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = createToken(user._id);
  setTokenCookie(res, token);

  res.json({ user });
});

// =====================================================
// LOGOUT
// =====================================================
exports.logout = asyncHandler(async (_req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0),
  });

  res.json({ message: 'Logged out' });
});

// =====================================================
// CURRENT USER
// =====================================================
exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// =====================================================
// UPDATE CURRENT USER
// =====================================================
exports.updateMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = {};

  // 🟦 Update your new fields
  if (req.body.fullName !== undefined) updates.fullName = req.body.fullName;
  if (req.body.location !== undefined) updates.location = req.body.location;
  if (req.body.role !== undefined) updates.role = req.body.role;
  if (req.body.phoneNumber !== undefined) updates.phoneNumber = req.body.phoneNumber;
  if (req.body.bio !== undefined) updates.bio = req.body.bio;

  // 🟦 Update legacy fields (still supported)
  if (req.body.name !== undefined) updates.name = req.body.name;

  // 🟦 Unique email check
  if (req.body.email !== undefined) {
    const existing = await User.findOne({ email: req.body.email });
    if (existing && existing._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    updates.email = req.body.email;
  }

  // 🟦 Unique username check
  if (req.body.username !== undefined) {
    const existingUser = await User.findOne({ username: req.body.username.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Username already in use' });
    }
    updates.username = req.body.username.toLowerCase();
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updates,
    { new: true, runValidators: true }
  );

  res.json({ user: updatedUser });
});