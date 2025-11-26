// src/services/ocr.service.js
const { spawn } = require('child_process');
const path = require('path');

exports.runOcrBuffer = function runOcrBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), 'worker', 'ocr_demo.py');

    const py = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'] // allow stdin
    });

    let stdout = '';
    let stderr = '';

    // Write buffer to python input stream
    py.stdin.write(buffer);
    py.stdin.end();

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`OCR failed: ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (e) {
        reject(new Error('Failed to parse OCR output'));
      }
    });
  });
};