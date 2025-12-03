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
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}



/* =====================================================
   REGISTER  — now uses fullName consistently
===================================================== */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  // Username = part before @, lowercased
  const usernameBase = normalizedEmail.split('@')[0].toLowerCase().trim();

  const user = await User.create({
    email: normalizedEmail,
    password,
    username: usernameBase,
    fullName: fullName.trim(),
    location: "",
    role: "user",
    phoneNumber: "",
    bio: "",
  });

  const token = createToken(user._id);
  setTokenCookie(res, token);

  res.status(201).json({ user });
});



/* =====================================================
   LOGIN (email OR username)
===================================================== */
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



/* =====================================================
   LOGOUT
===================================================== */
exports.logout = asyncHandler(async (_req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0),
  });

  res.json({ message: 'Logged out' });
});



/* =====================================================
   CURRENT USER
===================================================== */
exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});



/* =====================================================
   UPDATE PROFILE (fullName, email, username, etc.)
===================================================== */
exports.updateMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = {};

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
      updates[key] =
        typeof req.body[key] === "string"
          ? req.body[key].trim()
          : req.body[key];
    }
  }

  // Validate unique email
  if (updates.email !== undefined) {
    const normalizedEmail = updates.email.toLowerCase().trim();
    updates.email = normalizedEmail;

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists && exists._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Email already in use' });
    }
  }

  // Validate unique username
  if (updates.username !== undefined) {
    updates.username = updates.username.toLowerCase().trim();

    const exists = await User.findOne({ username: updates.username });
    if (exists && exists._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Username already in use' });
    }
  }

  const updated = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ user: updated });
});



/* =====================================================
   CHANGE PASSWORD
===================================================== */
exports.changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: 'Current and new password are required',
    });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      message: 'New password must be at least 8 characters long',
    });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  const token = createToken(user._id);
  setTokenCookie(res, token);

  res.json({
    message: 'Password updated successfully',
    user,
  });
});



/* =====================================================
   DELETE ACCOUNT — cascade delete
===================================================== */
exports.deleteMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1) Fetch receipts so we can delete underlying GridFS files
  const receipts = await Receipt.find({ user: userId });

  // 2) Delete files from GridFS (continue on error)
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
    }
  }

  // 3) Delete receipts
  await Receipt.deleteMany({ user: userId });

  // 4) Delete records
  await Record.deleteMany({ user: userId });

  // 5) Delete user
  await User.findByIdAndDelete(userId);

  // 6) Clear auth cookie
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