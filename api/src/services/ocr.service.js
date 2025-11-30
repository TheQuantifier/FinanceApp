// src/services/ocr.service.js
const { spawn } = require('child_process');
const path = require('path');
const { ocrWorkerScript } = require('../config/env');

exports.runOcrBuffer = function runOcrBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), ocrWorkerScript);

    // Allow override via PYTHON_BIN if needed
    const pythonBin = process.env.PYTHON_BIN || 'python3';

    const py = spawn(pythonBin, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'], // allow stdin/out/err
    });

    let stdout = '';
    let stderr = '';

    // Ensure buffer is written safely
    try {
      py.stdin.write(buffer);
      py.stdin.end();
    } catch (err) {
      return reject(new Error(`Failed to write to OCR process: ${err.message}`));
    }

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('error', (err) => {
      reject(new Error(`Failed to start OCR process: ${err.message}`));
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`OCR failed (code ${code}): ${stderr || stdout}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        return resolve(parsed);
      } catch (e) {
        return reject(new Error(`Failed to parse OCR output: ${stdout}`));
      }
    });
  });
};
