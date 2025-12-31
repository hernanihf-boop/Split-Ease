import { GoogleGenAI } from "@google/genai";
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
      text: "Analyze the receipt and provide a JSON object with: 'merchantName' (string), 'transactionDate' (string in 'YYYY-MM-DD' format), and 'totalAmount' (number). Return only the JSON."
    };

    // Usando el modelo recomendado gemini-3-flash-preview para mayor velocidad y precisión
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [imagePart, textPart] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error('Error en Gemini Function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error processing receipt.' }),
    };
  }
};

export { handler };