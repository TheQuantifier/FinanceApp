// src/services/ocr.service.js
import { spawn } from "child_process";
import path from "path";

import env from "../config/env.js";

export function runOcrBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), env.ocrWorkerScript);

    // Allow override via env.js (falls back to python3 if unset)
    const pythonBin = env.pythonBin || "python3";

    const py = spawn(pythonBin, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"], // stdin/out/err
    });

    let stdout = "";
    let stderr = "";

    try {
      py.stdin.write(buffer);
      py.stdin.end();
    } catch (err) {
      return reject(new Error(`Failed to write to OCR process: ${err.message}`));
    }

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to start OCR process: ${err.message}`));
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`OCR failed (code ${code}): ${stderr || stdout}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        return resolve(parsed);
      } catch {
        return reject(new Error(`Failed to parse OCR output: ${stdout}`));
      }
    });
  });
}
