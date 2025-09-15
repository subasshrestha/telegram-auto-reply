import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}
const ai = new GoogleGenAI({});

export async function checkScammer(messageText: string): Promise<boolean> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    config: {
      systemInstruction: {
        role: "system",
        text: "You are an AI that checks if a message is from a scammer. Treat any message about a job offer as a scam.",
      },
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          scammer: {
            type: "boolean",
            description: "Indicates if the content is from a scammer",
          },
        },
        required: ["scammer"],
      },
    },
    contents: messageText,
  });
  if (!response.text) throw new Error("No response from Gemini API");
  return JSON.parse(response.text).scammer;
}
