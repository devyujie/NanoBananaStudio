
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export type Resolution = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

/**
 * Generates an image using the Gemini 3 Pro Image Preview model.
 * Supports text-to-image and image-to-image (multimodal).
 */
export const generateImage = async (
  prompt: string, 
  referenceImages: string[] = [],
  resolution: Resolution = '1K',
  aspectRatio: AspectRatio = '1:1'
): Promise<string> => {
  try {
    const ai = getClient();
    
    // Prepare contents
    const parts: any[] = [];

    // Add text prompt
    parts.push({ text: prompt });

    // Add reference images
    // Update: Support up to 2 images.
    // Loop through provided images, max 2
    const imagesToProcess = referenceImages.slice(0, 2);
    
    for (const imgData of imagesToProcess) {
      const matches = imgData.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    // Sanitize Aspect Ratio - Gemini 3 Pro Image Preview only supports specific ratios
    const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9", "21:9"];
    const finalAspectRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: parts,
      config: {
        imageConfig: {
          imageSize: resolution,
          aspectRatio: finalAspectRatio,
        },
      },
    });

    let base64Image = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          base64Image = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }
    
    if (base64Image) {
      return base64Image;
    } else {
      const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
      if (textPart) {
        throw new Error(textPart.text || "Generation failed");
      }
      throw new Error("No image data found in response");
    }
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    
    let errorMessage = error.message || "Unknown error occurred";

    if (typeof errorMessage === 'string' && (errorMessage.includes('{') || errorMessage.includes('['))) {
      try {
        const jsonMatch = errorMessage.match(/(\{[\s\S]*\})/);
        const jsonStr = jsonMatch ? jsonMatch[1] : errorMessage;
        const parsed = JSON.parse(jsonStr);
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch (e) {
        // Ignore parse error
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Edits an existing image using Gemini 2.5 Flash Image model.
 */
export const editImage = async (
  prompt: string,
  inputImageBase64: string
): Promise<string> => {
  try {
    const ai = getClient();
    const parts: any[] = [];

    // Add instruction/prompt
    parts.push({ text: prompt });

    // Add input image
    const matches = inputImageBase64.match(/^data:(.+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      parts.push({
        inlineData: {
          mimeType: matches[1],
          data: matches[2]
        }
      });
    } else {
      throw new Error("Invalid image data format");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using Flash for editing as per request/example
      contents: parts,
      // Flash image model doesn't support imageConfig like aspect ratio/size in the same way as Pro-Vision or it infers from input
    });

    let base64Image = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          base64Image = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (base64Image) {
      return base64Image;
    } else {
      const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
      if (textPart) {
        throw new Error(textPart.text || "Edit failed");
      }
      throw new Error("No image data found in response");
    }
  } catch (error: any) {
    console.error("Gemini Image Edit Error:", error);
    let errorMessage = error.message || "Unknown error occurred";
    if (typeof errorMessage === 'string' && (errorMessage.includes('{') || errorMessage.includes('['))) {
      try {
        const jsonMatch = errorMessage.match(/(\{[\s\S]*\})/);
        const jsonStr = jsonMatch ? jsonMatch[1] : errorMessage;
        const parsed = JSON.parse(jsonStr);
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch (e) { }
    }
    throw new Error(errorMessage);
  }
};
