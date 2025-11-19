import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateColorPalette(prompt: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a 5-color palette for a music visualizer based on the theme: "${prompt}". The first color should be a very dark, near-black background. The other four colors must be extremely vibrant, saturated, and energetic, suitable for a dynamic music visualizer. They should be harmonious but pop against the dark background. Think neon, electric, or synthwave vibes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            palette: {
              type: Type.ARRAY,
              description: "An array of 5 hex color code strings. The first is the background, the others are for the bars.",
              items: {
                type: Type.STRING,
                description: "A hex color code, e.g., #1A2B3C",
              },
            },
          },
          required: ["palette"],
        },
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    if (result.palette && Array.isArray(result.palette) && result.palette.length > 0) {
      return result.palette;
    } else {
      throw new Error("Invalid palette format received from AI.");
    }
  } catch (error) {
    console.error("Error generating color palette:", error);
    throw new Error("Could not generate a color palette. The AI service might be unavailable or the prompt was invalid.");
  }
}

export async function generateTitle(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a creative assistant for a music visualizer app.
      Based on the following theme or vibe, generate a short, catchy, and evocative title for the video.
      The title should be at most 10 words. Do not use quotes or any other formatting in your response, just the plain text of the title.
      Theme: "${prompt}"`,
    });

    const title = response.text.trim().replace(/["']/g, ''); // Clean up quotes just in case
    if (!title) {
      throw new Error("AI returned an empty title.");
    }
    return title;
  } catch (error) {
    console.error("Error generating title:", error);
    throw new Error("Could not generate a title from the AI service.");
  }
}