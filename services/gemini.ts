
import { GoogleGenAI, Type } from "@google/genai";
import { MineralComposition, AnalysisResult, DtaPeak, XrdPeak, XrfData, IcpMsData, PetrographyData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSample = async (comp: MineralComposition, extraInfo: string = ""): Promise<AnalysisResult> => {
  const prompt = `
    Analyze a molasse sediment sample with the following mineralogy:
    Quartz (Q): ${comp.q}%
    Feldspar (F): ${comp.f}%
    Lithics (L): ${comp.l}%
    
    [Holistic Analytical Context]:
    ${extraInfo}

    Based on the Dickinson QFL model for orogenic sediments and the provided laboratory data, perform a comprehensive fingerprinting analysis. 
    You must cross-reference the mineralogical position with geochemical signatures (XRD minerals, XRF oxides, ICP-MS traces, REE patterns) to provide:
    
    1. Provenance category (Stable Craton, Typical Molasse, Basement Uplift, or Dissected Arc).
    2. Paleoclimate interpretation (Humid Tropical, Arid/Semi-arid, or Temperate).
    3. Estimated Geochemical Chemical Index of Alteration (CIA) - justify this using XRF oxides if available.
    4. Estimated Th/Sc ratio - use ICP-MS data if provided to be precise.
    5. A concise geological interpretation (max 100 words) that summarizes the tectonic setting, basin evolution stage, and dominant weathering regime.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          provenance: { type: Type.STRING },
          paleoclimate: { type: Type.STRING },
          geochemicalIndices: {
            type: Type.OBJECT,
            properties: {
              cia: { type: Type.NUMBER },
              thSc: { type: Type.NUMBER }
            }
          },
          interpretation: { type: Type.STRING }
        },
        required: ["provenance", "paleoclimate", "geochemicalIndices", "interpretation"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to receive a valid response.");
  return JSON.parse(text);
};

export const interpretXrd = async (peaks: XrdPeak[]): Promise<XrdPeak[]> => {
  const prompt = `Interpret these X-Ray Diffraction (XRD) peaks (2nd-Theta, Intensity) to identify minerals: ${JSON.stringify(peaks)}`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            twoTheta: { type: Type.NUMBER },
            intensity: { type: Type.NUMBER },
            mineral: { type: Type.STRING }
          },
          required: ["twoTheta", "intensity", "mineral"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const interpretXrf = async (data: Record<string, number>): Promise<XrfData> => {
  const prompt = `Interpret this XRF bulk chemical data (Major Oxides): ${JSON.stringify(data)}. Provide a geological interpretation regarding tectonic setting and weathering intensity.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          elements: { 
            type: Type.OBJECT, 
            properties: {
              "SiO2": { type: Type.NUMBER }
            },
            additionalProperties: { type: Type.NUMBER } 
          },
          interpretation: { type: Type.STRING }
        },
        required: ["elements", "interpretation"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const interpretIcpMs = async (data: Record<string, number>): Promise<IcpMsData> => {
  const prompt = `Interpret this ICP-MS Trace Element data (ppm): ${JSON.stringify(data)}. Provide a REE pattern summary and a provenance interpretation.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          traceElements: { 
            type: Type.OBJECT,
            properties: { "La": { type: Type.NUMBER } },
            additionalProperties: { type: Type.NUMBER }
          },
          reePattern: { type: Type.STRING },
          interpretation: { type: Type.STRING }
        },
        required: ["traceElements", "reePattern", "interpretation"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const interpretPetrography = async (notes: string, image?: string): Promise<PetrographyData> => {
  const parts: any[] = [{ text: `Perform a petrographic analysis of this thin section description: ${notes}.` }];
  if (image) parts.push({ inlineData: { mimeType: "image/jpeg", data: image.split(',')[1] } });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          grainSize: { type: Type.STRING },
          sorting: { type: Type.STRING },
          rounding: { type: Type.STRING },
          matrixPercent: { type: Type.NUMBER },
          cementType: { type: Type.STRING },
          description: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const interpretDtaPeaks = async (peaks: { temperature: number; value: number; type: string }[]): Promise<DtaPeak[]> => {
  const prompt = `Identify common minerals from DTA peaks: ${JSON.stringify(peaks)}`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            temperature: { type: Type.NUMBER },
            value: { type: Type.NUMBER },
            type: { type: Type.STRING },
            mineralInterpretation: { type: Type.STRING }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export interface ChatAttachment {
  name: string;
  mimeType: string;
  data: string;
  content?: string;
}

export const chatWithMentor = async (history: {role: 'user' | 'assistant', content: string}[], message: string, attachments: ChatAttachment[] = []) => {
  const parts: any[] = [{ text: message }];
  attachments.forEach(att => {
    if (att.mimeType.startsWith('image/')) {
      parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
    } else if (att.content) {
      parts.push({ text: `[Attached: ${att.name}]\n${att.content}` });
    }
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: "You are Molasse Mentor, an expert in sedimentary petrology and geochemistry. You analyze complex analytical data (XRD, XRF, ICP-MS, DTA, Petrography) to interpret orogenic basin history."
    }
  });
  return response.text || "Processing error.";
};
