import { GoogleGenAI } from "@google/genai";
import type { Handler, HandlerEvent } from "@netlify/functions";

// This check is to ensure the API_KEY is set in your Netlify environment variables
if (!process.env.API_KEY) {
  throw new Error("Missing API_KEY environment variable.");
}

// Initialize the Gemini AI client with the secure environment variable
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
      text: `Analyze the receipt and provide a JSON object with: "merchantName" (string), "transactionDate" (string in "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" format), and "totalAmount" (number). Respond with only the raw JSON object.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
      },
    });

    // Return the successful response text to the frontend
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error('Error in serverless function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to process image with AI.' }),
    };
  }
};

export { handler };
