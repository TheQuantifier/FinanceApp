// src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const apiRouter = require('./routes');
const { errorHandler } = require('./middleware/error');

const app = express();

// --------------------------------------------------
// Logging
// --------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --------------------------------------------------
// JSON + Form Parsing
// --------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// Cookies
// --------------------------------------------------
app.use(cookieParser());

// --------------------------------------------------
// CORS CONFIG — REQUIRED FOR RENDER + GITHUB PAGES
// --------------------------------------------------

const allowedOrigins = [
  "https://app.thequantifier.com",   // Your live frontend
  "https://thequantifier.com",
  "https://www.thequantifier.com",
  "http://localhost:5000",           // Local backend
  "http://localhost:5500",           // VS Code Live Server
  "http://127.0.0.1:5500",           // Local file server alt
  "http://localhost:3000",           // React dev server
];

// Must come BEFORE cors()
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Main CORS handler
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman / curl / server-side

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("❌ BLOCKED CORS ORIGIN:", origin);
      return callback(new Error("CORS: Not allowed by server"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

// Preflight
app.options("*", cors());

// --------------------------------------------------
// Health Check
// --------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------
app.use('/api', apiRouter);

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------
app.use(errorHandler);

module.exports = app;