// src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import env from "../config/env.js";
import asyncHandler from "../middleware/async.js";
import { query } from "../config/db.js";

import {
  createUser,
  findUserById,
  findUserAuthById,
  findUserAuthByIdentifier,
  updateUserById,
  updateUserPasswordHash,
} from "../models/user.model.js";

// If you have an R2 service, we’ll use it to delete objects on account deletion.
// If your service file name differs, adjust the import path accordingly.
import { deleteObject } from "../services/r2.service.js";

function createToken(id) {
  return jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function setTokenCookie(res, token) {
  const isProd = env.nodeEnv === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd, // secure cookies require HTTPS in production
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearTokenCookie(res) {
  const isProd = env.nodeEnv === "production";

  res.cookie("token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    expires: new Date(0),
  });
}

/* =====================================================
   REGISTER — uses fullName consistently
===================================================== */
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const usernameBase = normalizedEmail.split("@")[0].toLowerCase().trim();

  // Check if email already in use
  const existing = await findUserAuthByIdentifier(normalizedEmail);
  if (existing && String(existing.email).toLowerCase() === normalizedEmail) {
    return res.status(400).json({ message: "Email already in use" });
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  // (If username collisions happen, you can later add a suffix strategy.)
  const user = await createUser({
    email: normalizedEmail,
    username: usernameBase,
    passwordHash,
    fullName: String(fullName).trim(),
    location: "",
    role: "user",
    phoneNumber: "",
    bio: "",
  });

  const token = createToken(user.id);
  setTokenCookie(res, token);

  res.status(201).json({ user });
});

/* =====================================================
   LOGIN (email OR username)
===================================================== */
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Missing identifier or password" });
  }

  const user = await findUserAuthByIdentifier(identifier);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(String(password), user.password_hash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken(user.id);
  setTokenCookie(res, token);

  // Return safe user shape (no password_hash)
  const safeUser = await findUserById(user.id);
  res.json({ user: safeUser });
});

/* =====================================================
   LOGOUT
===================================================== */
export const logout = asyncHandler(async (_req, res) => {
  clearTokenCookie(res);
  res.json({ message: "Logged out" });
});

/* =====================================================
   CURRENT USER
===================================================== */
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

/* =====================================================
   UPDATE PROFILE (fullName, email, username, etc.)
===================================================== */
export const updateMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updates = {};

  const allowedFields = ["username", "email", "fullName", "location", "role", "phoneNumber", "bio"];

  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates[key] = typeof req.body[key] === "string" ? req.body[key].trim() : req.body[key];
    }
  }

  // Unique email check
  if (updates.email !== undefined) {
    updates.email = String(updates.email).toLowerCase().trim();

    const { rows } = await query(
      `SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`,
      [updates.email]
    );
    if (rows[0] && rows[0].id !== userId) {
      return res.status(400).json({ message: "Email already in use" });
    }
  }

  // Unique username check
  if (updates.username !== undefined) {
    updates.username = String(updates.username).toLowerCase().trim();

    const { rows } = await query(
      `SELECT id FROM users WHERE lower(username) = $1 LIMIT 1`,
      [updates.username]
    );
    if (rows[0] && rows[0].id !== userId) {
      return res.status(400).json({ message: "Username already in use" });
    }
  }

  const updated = await updateUserById(userId, updates);
  res.json({ user: updated });
});

/* =====================================================
   CHANGE PASSWORD
===================================================== */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required" });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters long" });
  }

  const user = await findUserAuthById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(String(currentPassword), user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  const salt = await bcrypt.genSalt(12);
  const newHash = await bcrypt.hash(String(newPassword), salt);

  await updateUserPasswordHash(userId, newHash);

  const token = createToken(userId);
  setTokenCookie(res, token);

  const safeUser = await findUserById(userId);

  res.json({
    message: "Password updated successfully",
    user: safeUser,
  });
});

/* =====================================================
   DELETE ACCOUNT — cascade delete
===================================================== */
export const deleteMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1) Fetch receipt object keys so we can delete R2 files (continue on error)
  const { rows: receiptRows } = await query(
    `SELECT id, object_key FROM receipts WHERE user_id = $1`,
    [userId]
  );

  for (const r of receiptRows) {
    try {
      if (r.object_key) {
        await deleteObject({ key: r.object_key });
      }
    } catch (err) {
      console.error("Error deleting R2 object for receipt", r.id, err);
    }
  }

  // 2) Delete the user. records/receipts cascade via FK ON DELETE CASCADE
  await query(`DELETE FROM users WHERE id = $1`, [userId]);

  // 3) Clear auth cookie
  clearTokenCookie(res);

  res.json({ message: "Account and all associated data have been deleted" });
});
