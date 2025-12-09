// src/services/aiParser.service.js
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_CHARS = parseInt(process.env.AI_MAX_CHARS || "5000");

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

exports.parseReceiptText = async function (ocrText) {
  if (!ocrText || ocrText.trim().length < 5) {
    console.log("⚠️ AI Parser: OCR text empty or too short. Skipping AI.");
    return null;
  }

  // Safety truncation
  let textToSend = ocrText;
  if (ocrText.length > MAX_CHARS) {
    console.warn(
      `⚠️ AI Parser: OCR text truncated from ${ocrText.length} → ${MAX_CHARS}`
    );
    textToSend = ocrText.substring(0, MAX_CHARS);
  }

  console.log("🤖 Sending OCR text to OpenAI...");
  console.log("📝 Preview:", textToSend.slice(0, 300));

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: PARSE_PROMPT },
        { role: "user", content: textToSend },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    console.log("🤖 AI Raw Response:", raw);

    // Extract JSON safely
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.warn("⚠️ AI Parsing: No JSON detected in AI response.");
      return null;
    }

    const jsonString = raw.substring(start, end + 1);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (jsonErr) {
      console.warn("⚠️ AI Parsing: Failed to parse JSON.", jsonErr);
      return null;
    }

    console.log("✅ AI Parsed JSON:", parsed);
    return parsed;
  } catch (err) {
    if (err?.error?.type === "insufficient_quota") {
      console.warn("❌ AI quota exceeded — skipping parsing.");
      return null;
    }

    console.error("❌ AI Parsing Error:", err);
    return null;
  }
};
