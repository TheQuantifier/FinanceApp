// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../config/env");

module.exports = async function auth(req, res, next) {
  try {
    let token = null;

    // 1. Try HTTP-only cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2. Fall back to Authorization header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    // Missing token completely
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Validate JWT
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Load user from DB
    const user = await User.findById(payload.id);
    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found or no longer exists" });
    }

    // Attach full, safe user object to request
    req.user = {
      _id: user._id,
      id: user._id.toString(), // backward compatibility
      email: user.email,
      name: user.name,
      preferredName: user.preferredName || "",
      phone: user.phone || "",
      bio: user.bio || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    return res.status(500).json({ message: "Server authentication error" });
  }
};