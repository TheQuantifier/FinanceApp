// src/config/env.js
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,

  mongoUri: required('MONGODB_URI'),
  mongoDbName: process.env.MONGODB_DB || 'finance_app',

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // comma-separated list of allowed origins
  clientOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map((o) => o.trim()),

  uploadTmpDir: process.env.UPLOAD_DIR || './tmp_uploads',

  // resolves relative to project root even in Render
  ocrWorkerScript: process.env.OCR_WORKER_SCRIPT
    ? path.resolve(process.env.OCR_WORKER_SCRIPT)
    : path.resolve(__dirname, '..', '..', 'worker', 'ocr_demo.py'),
};