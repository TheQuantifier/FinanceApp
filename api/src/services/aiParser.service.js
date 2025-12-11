// src/services/aiParser.service.js
const { GoogleGenAI } = require("@google/genai");

const MAX_CHARS = parseInt(process.env.AI_MAX_CHARS || "5000");
const USE_GEMINI = process.env.AI_PROVIDER === "gemini";

// ---------------------------------------------------------
// Receipt Parsing Prompt — aligned with your Receipt schema
// ---------------------------------------------------------
const PARSE_PROMPT = `
You are a financial receipt extraction system.

From the receipt text, extract ONLY the following fields:

- date: Purchase date in YYYY-MM-DD format
- source: Store or venue name
- subAmount: Subtotal before tax (number)
- amount: Final total charged including tax (number)
- taxAmount: Tax charged (number)
- payMethod: One of:
    Cash, Check, Credit Card, Debit Card, Gift Card, Multiple, Other
- items: Array of objects [{ "name": string, "price": number }]

Return JSON ONLY in this exact structure:

{
  "date": "",
  "source": "",
  "subAmount": 0,
  "amount": 0,
  "taxAmount": 0,
  "payMethod": "",
  "items": []
}

No explanations. No markdown. Only JSON.
`;

// ---------------------------------------------------------
// Helper: Extract JSON from Gemini output safely
// ---------------------------------------------------------
function extractJson(raw) {
  if (!raw || typeof raw !== "string") return null;

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1).trim());
  } catch (e) {
    console.warn("⚠️ Failed to parse JSON from model output.");
    return null;
  }
}

// ---------------------------------------------------------
// Helper: Normalize parsed fields to match schema
// ---------------------------------------------------------
function normalize(parsed = {}) {
  return {
    date: parsed.date || "",
    source: parsed.source || "",
    subAmount: Number(parsed.subAmount) || 0,
    amount: Number(parsed.amount) || 0,
    taxAmount: Number(parsed.taxAmount) || 0,
    payMethod: parsed.payMethod || "Other",
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

// ---------------------------------------------------------
// Gemini Request with retry support
// ---------------------------------------------------------
async function runGeminiWithRetry(ai, modelName, contents, retries = 2) {
  try {
    return await ai.models.generateContent({ model: modelName, contents });
  } catch (err) {
    if (retries > 0 && err?.status === 503) {
      console.warn("🔁 Gemini overloaded. Retrying...");
      await new Promise((res) => setTimeout(res, 300)); // small delay
      return runGeminiWithRetry(ai, modelName, contents, retries - 1);
    }
    throw err;
  }
}

// ---------------------------------------------------------
// Main Receipt Parsing Function
// ---------------------------------------------------------
exports.parseReceiptText = async function (ocrText) {
  if (!ocrText || ocrText.trim().length < 5) return null;

  // Truncate long OCR input
  let text = ocrText;
  if (text.length > MAX_CHARS) {
    console.warn(`Gemini: OCR truncated ${text.length} -> ${MAX_CHARS}`);
    text = text.slice(0, MAX_CHARS);
  }

  if (!USE_GEMINI) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    console.log("🤖 Using Gemini model:", modelName);

    const contents = [
      { role: "system", text: PARSE_PROMPT },
      { role: "user", text }
    ];

    // Run with retry support
    const response = await runGeminiWithRetry(ai, modelName, contents);

    // Gemini SDK v1+ → text is obtained via response.text()
    const raw = await response.text();

    const parsed = extractJson(raw);
    if (!parsed) return null;

    return normalize(parsed);
  }

  catch (err) {
    console.error("❌ Gemini Parsing Error:", err);
    return null;
  }
};
