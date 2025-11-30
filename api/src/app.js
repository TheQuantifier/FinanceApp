// src/app.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const apiRouter = require("./routes");
const { errorHandler } = require("./middleware/error");

const app = express();

// --------------------------------------------------
// Logging
// --------------------------------------------------
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// --------------------------------------------------
// JSON + Form Parsing
// --------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// Cookies
// --------------------------------------------------
app.use(cookieParser());

// --------------------------------------------------
// CORS CONFIG — REQUIRED FOR RENDER + GITHUB PAGES
// --------------------------------------------------

// Allowed origins for frontends
const allowedOrigins = [
  "https://app.thequantifier.com", // Your frontend domain (GitHub Pages)
  "http://localhost:5000",         // Local backend
  "http://localhost:5500",         // Local static dev (Live Server)
  "http://localhost:3000",         // Local frontend alternative
];

// Always send this header (needed for credentialed requests)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Main CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow Postman, curl, server-side
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Do NOT throw error — just block
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight routes must also send CORS headers
app.options("*", cors());

// --------------------------------------------------
// Health Check
// --------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------
app.use("/api", apiRouter);

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------
app.use(errorHandler);

module.exports = app;