// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

module.exports = async function auth(req, res, next) {
  try {
    let token = req.cookies?.token || null;

    if (!token && req.headers.authorization) {
      const [type, value] = req.headers.authorization.split(' ');
      if (type === 'Bearer') token = value;
    }

    if (!token)
      return res.status(401).json({ message: 'Authentication required' });

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(payload.id);
    if (!user)
      return res.status(401).json({ message: 'User not found or removed' });

    // Attach full safe user (password already stripped by toJSON)
    req.user = user;

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(500).json({ message: "Authentication server error" });
  }
};