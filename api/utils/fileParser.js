const fs = require("fs");
const path = require("path");
const PDFParser = require("pdf2json"); // CommonJS-compatible PDF parser
const { parse } = require("csv-parse/sync");

/**
 * Extracts finance fields from a file or OCR text.
 * @param {string} absPath - Absolute path of uploaded file
 * @param {string} mimeType - File MIME type (PDF, CSV, TXT, etc.)
 * @param {string} [ocrText] - Optional OCR text
 * @returns {Promise<Object>} Parsed fields {Date, Source, Category, Amount, Method, Notes}
 */
async function parseFile(absPath, mimeType, ocrText = "") {
  let rawText = "";

  try {
    const ext = path.extname(absPath).toLowerCase();

    if (mimeType === "application/pdf" || ext === ".pdf") {
      rawText = await parsePDF(absPath);

      // fallback to OCR if text is empty
      if (!rawText && ocrText) rawText = ocrText;
    } else if (mimeType.startsWith("text/") || ext === ".txt") {
      rawText = fs.readFileSync(absPath, "utf8");
    } else if (mimeType.includes("csv") || ext === ".csv") {
      return parseCSVFile(absPath);
    } else if (ocrText) {
      rawText = ocrText;
    } else {
      return null; // unsupported file
    }
  } catch (err) {
    console.error("File parsing failed:", err);
    return null;
  }

  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (!text) return null;

  // First, try structured key-value extraction from OCR text
  const keyValueResult = parseKeyValueText(text);

  // Merge with regex-based extraction only if missing
  const result = {
    Date: keyValueResult.Date || extractDate(text),
    Source: keyValueResult.Source || extractSource(text),
    Category: keyValueResult.Category || extractCategory(text),
    Amount: keyValueResult.Amount || extractAmount(text),
    Method: keyValueResult.Method || extractMethod(text),
    Notes: keyValueResult.Notes || extractNotes(text)
  };

  return result;
}

/* ---------- PDF Parsing Helper ---------- */
function parsePDF(absPath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
      const rawText = pdfParser.getRawTextContent();
      resolve(rawText);
    });
    pdfParser.loadPDF(absPath);
  });
}

/* ---------- CSV Parsing Helper ---------- */
function parseCSVFile(absPath) {
  const fileContent = fs.readFileSync(absPath, "utf8");
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });

  if (!records.length) return null;

  const first = records[0];
  const keys = Object.keys(first).map(k => k.toLowerCase());

  function findKey(possible) {
    return keys.find(k => possible.includes(k)) || null;
  }

  const dateKey = findKey(["date", "transaction date", "posted date"]);
  const sourceKey = findKey(["source", "merchant", "description", "payee", "vendor"]);
  const categoryKey = findKey(["category", "type"]);
  const amountKey = findKey(["amount", "value", "debit", "credit"]);
  const methodKey = findKey(["method", "payment", "account", "card"]);
  const notesKey = findKey(["notes", "memo", "details"]);

  return {
    Date: first[dateKey] || null,
    Source: first[sourceKey] || null,
    Category: first[categoryKey] || null,
    Amount: first[amountKey] ? parseFloat(first[amountKey].replace(/[^0-9.-]/g, "")) : null,
    Method: first[methodKey] || null,
    Notes: first[notesKey] || JSON.stringify(first).slice(0, 120)
  };
}

function parseKeyValueText(text) {
    const result = {};
    const lines = text.split(/\n| {2,}/);
  
    let notesStarted = false;
    let notesContent = [];
  
    for (let line of lines) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
  
      if (key && rest.length > 0) {
        const lowerKey = key.trim().toLowerCase();
        switch (lowerKey) {
          case "date":
            result.Date = value;
            break;
          case "source":
            result.Source = value;
            break;
          case "category":
            result.Category = value;
            break;
          case "amount":
            result.Amount = parseFloat(value.replace(/[^0-9.-]/g, "")) || null;
            break;
          case "method":
          case "payment":
            result.Method = value;
            break;
          case "notes":
          case "memo":
          case "details":
            notesStarted = true;
            notesContent.push(value);
            break;
        }
      } else if (notesStarted) {
        // capture multiline notes
        notesContent.push(line.trim());
      }
    }
  
    if (notesContent.length > 0) {
      result.Notes = notesContent.join(" ").slice(0, 500); // limit to 500 chars
    }
  
    // fallback: detect method from text if not found
    if (!result.Method) result.Method = extractMethod(text);
  
    // fallback: generate notes if still empty
    if (!result.Notes) result.Notes = extractNotes(text);
  
    return result;
  }
  

/* ---------- Text Extraction Helpers ---------- */
function extractDate(text) {
  const match = text.match(/\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  if (match) {
    const date = new Date(match[1]);
    if (!isNaN(date)) return date.toISOString().slice(0, 10);
  }
  return null;
}

function extractAmount(text) {
  const match = text.match(/\$?\s?([0-9]+(?:[.,][0-9]{2}))/);
  return match ? parseFloat(match[1].replace(",", "")) : null;
}

function extractSource(text) {
  const lines = text.split(/\n| {2,}/).map(l => l.trim());
  for (const line of lines) {
    if (!/receipt|invoice|total|amount|subtotal|thank/i.test(line) && line.length > 2 && !line.match(/\d/)) {
      return line.split(/[:-]/)[0].trim();
    }
  }
  return null;
}

function extractCategory(text) {
  const categories = {
    food: ["restaurant", "cafe", "starbucks", "mcdonald", "food", "coffee"],
    travel: ["uber", "lyft", "flight", "airlines", "hotel", "taxi"],
    shopping: ["amazon", "store", "mall", "target", "walmart"],
    entertainment: ["movie", "cinema", "concert", "spotify", "netflix"],
    bills: ["electric", "water", "internet", "rent", "bill"]
  };

  const lower = text.toLowerCase();
  for (const [cat, words] of Object.entries(categories)) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return "other";
}

function extractMethod(text) {
  const lower = text.toLowerCase();
  if (lower.includes("credit")) return "Credit Card";
  if (lower.includes("debit")) return "Debit Card";
  if (lower.includes("cash")) return "Cash";
  if (lower.includes("venmo") || lower.includes("paypal") || lower.includes("zelle")) return "Digital Wallet";
  return null;
}

function extractNotes(text) {
  return text.slice(0, 120) + (text.length > 120 ? "..." : "");
}

module.exports = { parseFile };
