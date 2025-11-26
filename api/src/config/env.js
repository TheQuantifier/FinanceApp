// src/config/env.js
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the api root
dotenv.config({
  path: path.join(process.cwd(), '.env'),
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

  mongoUri: required('MONGO_URI'),
  mongoDbName: process.env.MONGO_DB_NAME || 'financeapp',

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5500',

  uploadTmpDir: process.env.UPLOAD_TMP_DIR || 'tmp_uploads',

  ocrWorkerScript: process.env.OCR_WORKER_SCRIPT || '../worker/ocr_demo.py',
};