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

// IMPORTANT — all allowed frontend origins
const allowedOrigins = [
  // Custom domain
  "https://app.thequantifier.com",
  "https://app.thequantifier.com/",

  // GitHub Pages (User & Project Pages)
  "https://thequantifier.github.io",
  "https://thequantifier.github.io/",
  "https://thequantifier.github.io/FinanceApp",
  "https://thequantifier.github.io/FinanceApp/",

  // Local development
  "http://localhost:5000",
  "http://localhost:5500",
  "http://localhost:3000",
];

// Always allow credentials
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Main CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-side tools (Postman, curl)
      if (!origin) return callback(null, true);

      // Normalize trailing slash
      const cleanedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(cleanedOrigin)) {
        return callback(null, true);
      }

      console.warn("❌ Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Explicit preflight handling — fixes EPIPE & CORS failures
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  return res.sendStatus(204);
});

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
