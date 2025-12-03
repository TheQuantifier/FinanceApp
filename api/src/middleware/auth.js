// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

module.exports = async function auth(req, res, next) {
  try {
    let token = null;

    /* ----------------------------------------------
       1. Prefer secure cookie
    ---------------------------------------------- */
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    /* ----------------------------------------------
       2. Fallback: Authorization Bearer header
    ---------------------------------------------- */
    if (!token && req.headers.authorization) {
      const [scheme, value] = req.headers.authorization.split(' ');

      if (scheme === 'Bearer' && value && value !== 'null' && value !== 'undefined') {
        token = value.trim();
      }
    }

    /* ----------------------------------------------
       3. Missing token → reject
    ---------------------------------------------- */
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    /* ----------------------------------------------
       4. Verify token
    ---------------------------------------------- */
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    /* ----------------------------------------------
       5. Fetch user
       toJSON() automatically strips password
    ---------------------------------------------- */
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    /* ----------------------------------------------
       6. Attach safe user to req
    ---------------------------------------------- */
    req.user = user;

    return next();

  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(500).json({ message: 'Authentication server error' });
  }
};