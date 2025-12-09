// src/services/aiParser.service.js
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_CHARS = parseInt(process.env.AI_MAX_CHARS || "5000"); // fallback

const PARSE_PROMPT = `
You are a financial receipt extraction system.

Extract the following fields from the text:
- vendor (string)
- date (YYYY-MM-DD)
- total amount (number)
- tax amount
- items array [{ name, price }]
- payment method if found

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

exports.parseReceiptText = async function(ocrText) {
  if (!ocrText || ocrText.trim().length < 5) {
    return null;
  }

  // 🔥 TRUNCATION SAFETY STEP
  let textToSend = ocrText;
  if (ocrText.length > MAX_CHARS) {
    console.warn(`AI Parser: OCR text truncated from ${ocrText.length} → ${MAX_CHARS} characters.`);
    textToSend = ocrText.substring(0, MAX_CHARS);
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: PARSE_PROMPT },
        { role: "user", content: textToSend }
      ]
    });

    const raw = response.choices?.[0]?.message?.content || "{}";

    // Safe JSON extraction
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;

    return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  }

  catch (err) {
    if (err?.error?.type === "insufficient_quota") {
      console.warn("AI quota exceeded — skipping parsing.");
      return null;
    }

    console.error("AI Parsing Error:", err);
    return null;
  }
};
