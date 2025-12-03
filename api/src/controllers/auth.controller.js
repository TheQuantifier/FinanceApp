const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Record = require('../models/Record');
const Receipt = require('../models/Receipt');
const asyncHandler = require('../middleware/async');
const { deleteFromGridFS } = require('../lib/gridfs');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function createToken(id) {
  return jwt.sign({ id }, jwtSecret, { expiresIn: jwtExpiresIn });
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
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

  const normalizedEmail = email.toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return res.status(400).json({ message: 'Email already in use' });

  const usernameBase = normalizedEmail.split('@')[0];

  const user = await User.create({
    email: normalizedEmail,
    password,
    username: usernameBase,
    fullName: name,
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
// LOGIN (email OR username)
// =====================================================
exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Missing identifier or password' });
  }

  const lookup = identifier.toLowerCase().trim();

  const user = await User.findOne({
    $or: [{ email: lookup }, { username: lookup }],
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
// UPDATE PROFILE
// =====================================================
exports.updateMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = {};

  // Allowed fields
  const allowedFields = [
    "username",
    "email",
    "fullName",
    "location",
    "role",
    "phoneNumber",
    "bio",
  ];

  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates[key] = typeof req.body[key] === "string"
        ? req.body[key].trim()
        : req.body[key];
    }
  }

  // Unique email
  if (updates.email !== undefined) {
    const emailCheck = await User.findOne({ email: updates.email });
    if (emailCheck && emailCheck._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Email already in use' });
    }
  }

  // Unique username
  if (updates.username !== undefined) {
    updates.username = updates.username.toLowerCase().trim();
    const usernameCheck = await User.findOne({ username: updates.username });
    if (usernameCheck && usernameCheck._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Username already in use' });
    }
  }

  const updated = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ user: updated });
});

// =====================================================
// CHANGE PASSWORD
// =====================================================
// Body: { currentPassword, newPassword }
exports.changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword; // will be hashed by pre('save') hook
  await user.save();

  // Optional: issue a fresh token after password change
  const token = createToken(user._id);
  setTokenCookie(res, token);

  res.json({
    message: 'Password updated successfully',
    user,
  });
});

// =====================================================
// DELETE ACCOUNT (CASCADE: Records, Receipts, Files, User)
// =====================================================
exports.deleteMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1) Fetch receipts so we can delete underlying GridFS files
  const receipts = await Receipt.find({ user: userId });

  // 2) Delete associated GridFS files (best-effort; log but continue on error)
  for (const receipt of receipts) {
    try {
      if (receipt.storedFileId) {
        await deleteFromGridFS(receipt.storedFileId);
      }
    } catch (err) {
      console.error(
        'Error deleting GridFS file for receipt',
        receipt._id.toString(),
        err
      );
      // Do NOT throw here; we still want to clean up DB and user
    }
  }

  // 3) Delete receipts from DB
  await Receipt.deleteMany({ user: userId });

  // 4) Delete financial records from DB
  await Record.deleteMany({ user: userId });

  // 5) Delete user account itself
  await User.findByIdAndDelete(userId);

  // 6) Clear auth cookie (log out)
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0),
  });

  res.json({
    message: 'Account and all associated data have been deleted',
  });
});