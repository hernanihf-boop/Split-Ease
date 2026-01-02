
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.API_KEY) {
    return res.status(500).json({ error: 'Missing API_KEY environment variable.' });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: 'Missing base64Image or mimeType' });
    }

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };
    
    const textPart = {
      text: "Analyze this receipt image and extract the merchant name, the total transaction amount, and the date of the transaction."
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

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Error en Gemini Vercel Function:', error);
    return res.status(500).json({ error: error.message || 'Error processing receipt.' });
  }
}
