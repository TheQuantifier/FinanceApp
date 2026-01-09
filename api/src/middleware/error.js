// src/middleware/error.js
import env from "../config/env.js";

export function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  const status = err.status || 500;

  const response = {
    message: err.message || "Internal server error",
  };

  // Include stack trace only outside production
  if (env.nodeEnv !== "production") {
    response.stack = err.stack;
  }

  // Prevent sending headers twice
  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json(response);
}
