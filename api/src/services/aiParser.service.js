// src/services/aiParser.service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const MAX_CHARS = parseInt(process.env.AI_MAX_CHARS || "5000");

// Enable Gemini if env says so
const USE_GEMINI = process.env.AI_PROVIDER === "gemini";

// System prompt for parsing receipts
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
  if (!ocrText || ocrText.trim().length < 5) {
    console.warn("Gemini Parser: OCR text too short, skipping.");
    return null;
  }

  // Truncate long OCR input
  let text = ocrText;
  if (text.length > MAX_CHARS) {
    console.warn(`Gemini Parser: OCR truncated ${text.length} → ${MAX_CHARS}`);
    text = text.slice(0, MAX_CHARS);
  }

  // ==================================================
  // GEMINI PARSING PIPELINE
  // ==================================================
  if (USE_GEMINI) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // IMPORTANT: Use the correct stable model name
      const modelName =
        process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

      console.log(`🤖 Using Gemini model: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0,
        },
      });

      console.log("🧠 Sending OCR text to Gemini...");

      const result = await model.generateContent([
        { text: PARSE_PROMPT },
        { text },
      ]);

      const raw = result.response.text() || "";

      // Extract JSON only
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");

      if (start === -1 || end === -1) {
        console.warn("Gemini Parser: No JSON found in AI response.");
        return null;
      }

      const jsonString = raw.slice(start, end + 1);

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (err) {
        console.error("❌ JSON parsing failed:", err);
        console.log("Raw returned text:", raw);
        return null;
      }

      console.log("🧠 Gemini Parsed Result:", parsed);
      return parsed;
    }

    catch (err) {
      if (err?.message?.includes("quota")) {
        console.warn("⚠️ Gemini quota exceeded — skipping parsing.");
        return null;
      }

      console.error("Gemini Parsing Error:", err);
      return null;
    }
  }

  // No providers active
  return null;
};
