import { GoogleGenerativeAI } from "@google/generative-ai";

const prompt = `Can you run ocr on this image and give the output as json, return isBill true if the image is a bill, return error if the image is not a bill.
Return a short description & category of the bill.
The icon of the category should be a valid icon name from the Ionicons library from react-native-vector-icons.

Use this JSON schema:

{
  "type": "object",
  "properties": {
    "description": { "type": "string" },
    "category": { "type": "object", "properties": {
      "name": { "type": "string" },
      "icon": { "type": "string" }
    } },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "quantity": { "type": "number" },
          "unit_price": { "type": "number" },
          "total_price": { "type": "number" }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "tax": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "amount": {"type": "number"}
            }
          }
        },
      "totalAmount": { "type": "number" },
        "currency": { "type": "string", "description": "ISO 4217 currency code e.g. USD, INR, EUR" }
      }
    },
  },
  "isBill": {"type": "boolean"},
  "error": {"type": "string"},
  "required": ["items", "summary", "isBill", "error", "description"]
}`;
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

export const ocr = async (base64Image, mimeType = "image/jpeg") => {
  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
    ]);

    return JSON.parse(result.response.text());
  } catch (error) {
    if (
        error.message?.includes('429') || 
        error.message?.includes('Resource has been exhausted') ||
        error.status === 429
    ) {
        return { 
            error: "RATE_LIMIT_EXCEEDED", 
            message: "We've hit the usage limit for the AI service. Please try again later." 
        };
    }
    
    console.error("Gemini Error:", error);
    return { error: "FAILED_TO_ANALYZE", message: "Failed to analyze bill. Please try again." };
  }
};

export default { ocr };
