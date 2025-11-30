// src/middleware/error.js
const { nodeEnv } = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  const status = err.status || 500;

  const response = {
    message: err.message || 'Internal server error',
  };

  // Include stack only in non-production
  if (nodeEnv !== 'production') {
    response.stack = err.stack;
  }

  // Prevent sending headers twice
  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json(response);
}

module.exports = { errorHandler };
