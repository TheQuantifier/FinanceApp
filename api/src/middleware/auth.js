// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

module.exports = async function auth(req, res, next) {
  try {
    // Token can come from: 
    // 1. HTTP-only cookie ("token")
    // 2. Authorization header ("Bearer <token>")
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Decode token
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Load user from DB
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // Attach sanitized user
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    next(err);
  }
};