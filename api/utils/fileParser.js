// api/utils/fileParser.js
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const XLSX = require("xlsx");

// Normalize text helper
function norm(s) {
  return (s || "").toString().replace(/\s+/g, " ").trim();
}

// Heuristic extraction from free text (PDF text or OCR text)
function extractFromText(text) {
  const out = { Date: null, Source: null, Category: null, Amount: null, Method: null, Notes: null };
  const t = norm(text);

  // Date (very simple ISO or common formats)
  const dateMatch =
    t.match(/\b(\d{4}-\d{2}-\d{2})\b/) ||                // 2025-10-17
    t.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/) ||        // 10/17/2025
    t.match(/\b([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})\b/);   // Oct 17, 2025
  if (dateMatch) out.Date = dateMatch[1];

  // Amount (take the first currency-ish number)
  const amtMatch =
    t.match(/\$?\s?(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s?(USD)?/i) ||
    t.match(/\btotal\s*[:\-]?\s*\$?\s*(-?\d+(?:\.\d{2})?)\b/i);
  if (amtMatch) out.Amount = Number(amtMatch[1].replace(/,/g, ""));

  // Method (simple lookups)
  const methods = ["cash", "credit card", "debit card", "ach", "paypal", "direct deposit", "check", "venmo", "zelle"];
  for (const m of methods) {
    if (t.toLowerCase().includes(m)) { out.Method = m[0].toUpperCase() + m.slice(1); break; }
  }

  // Category (naive guesses)
  const catMap = [
    { key: /grocery|market|supermarket|food|restaurant|dining/i, val: "Food" },
    { key: /fuel|gas|petro|shell|exxon|bp/i, val: "Transportation" },
    { key: /rent|lease|landlord/i, val: "Housing" },
    { key: /utility|power|electric|water|internet|wifi|cable/i, val: "Utilities" },
    { key: /health|pharmacy|clinic|hospital/i, val: "Health" },
  ];
  for (const k of catMap) { if (k.key.test(t)) { out.Category = k.val; break; } }

  // Source (merchant/vendor): take a likely uppercase line near top
  const firstLines = t.split(/\n|\r/).slice(0, 10).map(norm).filter(Boolean);
  const likelyName = firstLines.find(l => /[A-Z][A-Za-z0-9 &\-]{3,}/.test(l) && l.length <= 60);
  if (likelyName) out.Source = likelyName;

  // Notes: fallback short snippet
  out.Notes = (t.slice(0, 140) + (t.length > 140 ? "…" : "")).trim();

  return out;
}

// Parse XLSX: try mapping obvious columns
function extractFromXlsx(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // Try to find the first *complete-looking* row
  // Expected headers (case/space-insensitive): date, source, category, amount, method, notes
  if (!rows.length) return null;

  const lowerKeys = Object.keys(rows[0]).map(k => [k, k.toLowerCase().replace(/\s+/g, "")]);
  const keyMap = {};
  for (const [orig, low] of lowerKeys) {
    if (low.includes("date")) keyMap.Date = orig;
    else if (low.includes("source") || low.includes("merchant") || low.includes("vendor")) keyMap.Source = orig;
    else if (low.includes("category")) keyMap.Category = orig;
    else if (low.includes("amount") || low === "total") keyMap.Amount = orig;
    else if (low.includes("method") || low.includes("payment")) keyMap.Method = orig;
    else if (low.includes("note") || low.includes("memo") || low.includes("desc")) keyMap.Notes = orig;
  }

  const row = rows[0];
  const out = {
    Date: norm(row[keyMap.Date]),
    Source: norm(row[keyMap.Source]),
    Category: norm(row[keyMap.Category]),
    Amount: row[keyMap.Amount] === "" ? null : Number(String(row[keyMap.Amount]).replace(/,/g, "")),
    Method: norm(row[keyMap.Method]),
    Notes: norm(row[keyMap.Notes]),
  };

  // If nothing useful found, return null so caller can fall back
  const hasAny =
    out.Date || out.Source || out.Category || (out.Amount !== null && !Number.isNaN(out.Amount)) || out.Method || out.Notes;
  return hasAny ? out : null;
}

async function parsePdf(filePath, ocrText) {
  try {
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    const text = data.text && data.text.trim().length ? data.text : (ocrText || "");
    if (!text) return null;
    return extractFromText(text);
  } catch {
    // Fallback to OCR text if available
    if (ocrText) return extractFromText(ocrText);
    return null;
  }
}

async function parseFile(filePath, mime, ocrText = "") {
  const ext = path.extname(filePath).toLowerCase();

  if (mime === "application/pdf" || ext === ".pdf") {
    return await parsePdf(filePath, ocrText);
  }

  if (ext === ".xlsx" || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return extractFromXlsx(filePath);
  }

  // If we got OCR text (e.g., images processed elsewhere), try to extract from it.
  if (ocrText && typeof ocrText === "string" && ocrText.trim().length) {
    return extractFromText(ocrText);
  }

  // Unknown format → no structured data
  return null;
}

module.exports = { parseFile };
