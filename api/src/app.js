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
  "https://app.thequantifier.com",
  "https://app.thequantifier.com/",

  // GitHub Pages (User and Project Pages)
  "https://thequantifier.github.io",
  "https://thequantifier.github.io/",            // normalize slash
  "https://thequantifier.github.io/FinanceApp",
  "https://thequantifier.github.io/FinanceApp/", // normalize slash

  // Local development options
  "http://localhost:5000",
  "http://localhost:5500",
  "http://localhost:3000",
];

// Always allow credentials
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-side tools like Postman, curl (no browser origin)
      if (!origin) return callback(null, true);

      // Normalize trailing slash
      const cleanedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(cleanedOrigin)) {
        return callback(null, true);
      }

      console.warn("❌ Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight routes must still include CORS headers
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
