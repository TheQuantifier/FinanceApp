// src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function createToken(id) {
  return jwt.sign({ id }, jwtSecret, { expiresIn: jwtExpiresIn });
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: false, // Set to true on Render (HTTPS)
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// =====================================================
// REGISTER
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

  const user = await User.create({ email, password, name });
  const token = createToken(user._id);

  setTokenCookie(res, token);
  res.status(201).json({ user });
});

// =====================================================
// LOGIN
// =====================================================
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
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
    expires: new Date(0),
    sameSite: 'lax',
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
// UPDATE CURRENT USER (PUT /auth/me)
// =====================================================
exports.updateMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = {};

  // Only apply fields that were provided
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.preferredName !== undefined) updates.preferredName = req.body.preferredName;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.bio !== undefined) updates.bio = req.body.bio;

  // Email update must not conflict
  if (req.body.email !== undefined) {
    const existing = await User.findOne({ email: req.body.email });

    if (existing && existing._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: "Email already in use" });
    }
    updates.email = req.body.email;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updates,
    { new: true, runValidators: true }
  );

  return res.json({ user: updatedUser });
});