
import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent } from "@netlify/functions";

if (!process.env.API_KEY) {
  throw new Error("Missing API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { base64Image, mimeType } = JSON.parse(event.body || '{}');

    if (!base64Image || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing base64Image or mimeType' }),
      };
    }

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };
    
    const textPart = {
      text: "Analyze this receipt image and extract the merchant name, the total transaction amount, and the date of the transaction. If you cannot find a piece of information, return an empty string for text or 0 for amount."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchantName: {
              type: Type.STRING,
              description: "The name of the store or restaurant.",
            },
            transactionDate: {
              type: Type.STRING,
              description: "The date of the purchase in YYYY-MM-DD format.",
            },
            totalAmount: {
              type: Type.NUMBER,
              description: "The final total amount shown on the receipt.",
            },
          },
          required: ["merchantName", "totalAmount"],
        },
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error('Error in Gemini Netlify Function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error processing receipt.' }),
    };
  }
};

export { handler };