// src/middleware/error.js
const { nodeEnv } = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  const status = err.status || 500;

  const response = {
    message: err.message || 'Internal server error',
  };

  // Only show stack traces in development
  if (nodeEnv !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = { errorHandler };