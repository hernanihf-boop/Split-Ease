
import { GoogleGenAI } from "@google/genai";

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
      text: "Analyze the receipt and provide a JSON object with: 'merchantName' (string), 'transactionDate' (string in 'YYYY-MM-DD' format), and 'totalAmount' (number). Return only the JSON."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [imagePart, textPart] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Error en Gemini Vercel Function:', error);
    return res.status(500).json({ error: error.message || 'Error processing receipt.' });
  }
}
