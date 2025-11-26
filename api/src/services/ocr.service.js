// src/services/ocr.service.js
const { spawn } = require('child_process');
const path = require('path');
const { ocrWorkerScript } = require('../config/env');

exports.runOcr = function runOcr(filePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), 'worker', 'ocr_demo.py');

    // Spawn python worker
    const py = spawn('python3', [scriptPath, filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    // Collect output
    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Timeout safety (20 seconds)
    const timeout = setTimeout(() => {
      py.kill('SIGKILL');
      reject(new Error('OCR timed out'));
    }, 20000);

    py.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        return reject(
          new Error(`OCR worker exited with code ${code}: ${stderr}`)
        );
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Failed to parse OCR output: ' + err.message));
      }
    });
  });
};