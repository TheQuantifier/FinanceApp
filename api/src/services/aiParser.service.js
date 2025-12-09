// src/services/aiParser.service.js
const { GoogleGenAI } = require("@google/genai");

const MAX_CHARS = parseInt(process.env.AI_MAX_CHARS || "5000");

// Enable Gemini provider
const USE_GEMINI = process.env.AI_PROVIDER === "gemini";

const PARSE_PROMPT = `
You are a financial receipt extraction system.

Extract the following fields from the text:
- vendor (string)
- date (YYYY-MM-DD)
- total amount (number)
- tax amount (number)
- items array: [{ "name": string, "price": number }]
- paymentMethod (string, optional)

Return JSON ONLY:
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

  // Truncate overly long OCR
  let text = ocrText;
  if (text.length > MAX_CHARS) {
    console.warn(`Gemini: OCR truncated ${text.length} -> ${MAX_CHARS}`);
    text = text.slice(0, MAX_CHARS);
  }

  // =====================================================
  // GEMINI (NEW SDK): @google/genai
  // =====================================================
  if (USE_GEMINI) {
    try {
      const ai = new GoogleGenAI({}); // auto-picks GEMINI_API_KEY

      const modelName =
        process.env.GEMINI_MODEL || "gemini-2.5-flash"; // recommended default

      console.log("🤖 Using Gemini model:", modelName);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { role: "system", text: PARSE_PROMPT },
          { role: "user", text }
        ],
      });

      const raw = response.text || "";

      // Extract JSON content only
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) {
        console.warn("Gemini returned no JSON.");
        return null;
      }

      const jsonString = raw.slice(start, end + 1);

      return JSON.parse(jsonString);
    }

    catch (err) {
      console.error("Gemini Parsing Error:", err.message || err);
      return null;
    }
  }

  return null;
};
