// src/services/aiParser.service.js
const { GoogleGenAI } = require("@google/genai");

const MAX_CHARS = parseInt(process.env.AI_MAX_CHARS || "5000");
const USE_GEMINI = process.env.AI_PROVIDER === "gemini";

// ---------------------------------------------------------
// Receipt Parsing Prompt — aligned with YOUR schema
// ---------------------------------------------------------
const PARSE_PROMPT = `
You are a financial receipt extraction system.

From the receipt text, extract ONLY the following fields:

- date: Purchase date in YYYY-MM-DD format
- source: Store or venue name
- subAmount: Subtotal before tax (number)
- amount: Final total charged including tax (number)
- taxAmount: Tax charged (number)
- payMethod: One of the following values (if possible):
    Cash, Check, Credit Card, Debit Card, Gift Card, Multiple, Other
- items: Array of objects [{ "name": string, "price": number }]

Return JSON ONLY in this exact format:

{
  "date": "",
  "source": "",
  "subAmount": 0,
  "amount": 0,
  "taxAmount": 0,
  "payMethod": "",
  "items": []
}

- If information is missing, leave fields blank or 0.
- DO NOT return explanations.
- DO NOT return markdown.
- DO NOT include any text outside the JSON.
`;

exports.parseReceiptText = async function (ocrText) {
  if (!ocrText || ocrText.trim().length < 5) return null;

  // Safety truncate long OCR text
  let text = ocrText;
  if (text.length > MAX_CHARS) {
    console.warn(`Gemini: OCR truncated ${text.length} -> ${MAX_CHARS}`);
    text = text.slice(0, MAX_CHARS);
  }

  // -----------------------------------------------------
  // GEMINI Provider
  // -----------------------------------------------------
  if (USE_GEMINI) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });

      const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      console.log("🤖 Using Gemini model:", modelName);

      // Generate content
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { role: "system", text: PARSE_PROMPT },
          { role: "user", text }
        ]
      });

      // Gemini 2.0+ returns text via response.text()
      const raw = await response.text();

      if (!raw || typeof raw !== "string") {
        console.warn("⚠️ Gemini returned no text.");
        return null;
      }

      // Extract JSON from model output
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");

      if (start === -1 || end === -1) {
        console.warn("⚠️ Gemini did not return valid JSON.");
        return null;
      }

      const jsonString = raw.slice(start, end + 1).trim();

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (err) {
        console.warn("⚠️ Could not parse Gemini JSON:", jsonString);
        return null;
      }

      // Normalize to protect backend
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

    catch (err) {
      console.error("❌ Gemini Parsing Error:", err);
      return null;
    }
  }

  return null; // Provider disabled
};
