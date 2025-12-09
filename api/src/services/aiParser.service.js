// src/services/aiParser.service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const MAX_CHARS = parseInt(process.env.AI_MAX_CHARS || "5000");

// Use Gemini only (you can add providers later if needed)
const USE_GEMINI = process.env.AI_PROVIDER === "gemini";

const PARSE_PROMPT = `
You are a financial receipt extraction system.

Extract the following fields from the text:
- vendor (string)
- date (YYYY-MM-DD)
- total amount (number)
- tax amount (number if present)
- items array: [{ "name": string, "price": number }]
- payment method (string if detected)

Return **JSON ONLY** and nothing else:
{
  "vendor": "",
  "date": "",
  "total": 0,
  "tax": 0,
  "items": [],
  "paymentMethod": ""
}
`;

exports.parseReceiptText = async function (ocrText) {
  if (!ocrText || ocrText.trim().length < 5) return null;

  // Truncate if text is too long
  let text = ocrText;
  if (text.length > MAX_CHARS) {
    console.warn(`Gemini: OCR truncated from ${text.length} -> ${MAX_CHARS}`);
    text = text.slice(0, MAX_CHARS);
  }

  // ============================================
  // GEMINI 1.5 FLASH PARSER
  // ============================================
  if (USE_GEMINI) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0,
        }
      });

      const result = await model.generateContent([
        { text: PARSE_PROMPT },
        { text }
      ]);

      const raw = result.response.text() || "";

      // Extract only JSON between outermost {}
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) {
        console.warn("Gemini returned no JSON.");
        return null;
      }

      const json = raw.slice(start, end + 1);

      return JSON.parse(json);
    }

    catch (err) {
      if (err?.message?.includes("quota")) {
        console.warn("Gemini quota exceeded — skipping AI parsing.");
        return null;
      }

      console.error("Gemini Parsing Error:", err);
      return null;
    }
  }

  return null;
};
