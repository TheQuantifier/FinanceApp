// src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { clientOrigin, nodeEnv } = require('./config/env');
const apiRouter = require('./routes');
const { errorHandler } = require('./middleware/error');

const app = express();

// Logging
if (nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// JSON / form parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// CORS – for frontend JS calls
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// All API routes under /api
app.use('/api', apiRouter);

// Central error handler
app.use(errorHandler);

module.exports = app;