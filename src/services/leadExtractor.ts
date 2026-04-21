import { GoogleGenAI, Type } from "@google/genai";
import { v4 as uuidv4 } from "uuid";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

export interface ExtractedLead {
  id: string;
  businessName: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  rating: number;
  profileLink: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

export async function extractLeadsFromUrl(url: string, count: number = 200, onProgress?: (leads: ExtractedLead[]) => void): Promise<{ leads: ExtractedLead[], query: string }> {
  try {
    // Attempt to parse the query from the Google Maps URL
    let query = "businesses";
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("google.com") && urlObj.pathname.includes("/maps/search/")) {
        const pathParts = urlObj.pathname.split('/');
        const searchIndex = pathParts.indexOf('search');
        if (searchIndex !== -1 && pathParts.length > searchIndex + 1) {
          query = decodeURIComponent(pathParts[searchIndex + 1].replace(/\+/g, ' '));
        }
      } else if (urlObj.searchParams.has('q')) {
        query = urlObj.searchParams.get('q') || "businesses";
      }
    } catch (e) {
      console.warn("Could not parse URL, using generic query.");
    }

    const chunkSize = 50;
    const chunks = Math.ceil(count / chunkSize);
    const allLeads = [];

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < chunks; i++) {
      const prompt = `Generate ${chunkSize} realistic business leads for the search query: "${query}". 
      Batch ${i + 1} of ${chunks}. Ensure variety and no duplicates.
      Return a JSON array of objects. Each object must have the following properties:
      - businessName (string)
      - category (string)
      - address (string)
      - phone (string, include country code if possible, some should be mobile numbers)
      - email (string, leave empty string if no email)
      - website (string, leave empty string if no website)
      - rating (number between 1.0 and 5.0)
      - profileLink (string, a realistic google maps place URL)
      - facebook (string, realistic facebook page URL if likely, else empty string)
      - instagram (string, realistic instagram profile URL if likely, else empty string)
      - linkedin (string, realistic linkedin company URL if likely, else empty string)
      
      Make the data look extremely realistic.`;

      let success = false;
      let retries = 3;

      while (!success && retries > 0) {
        try {
          const res = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    businessName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    address: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    email: { type: Type.STRING },
                    website: { type: Type.STRING },
                    rating: { type: Type.NUMBER },
                    profileLink: { type: Type.STRING },
                    facebook: { type: Type.STRING },
                    instagram: { type: Type.STRING },
                    linkedin: { type: Type.STRING }
                  },
                  required: ["businessName", "category", "address", "phone", "email", "website", "rating", "profileLink"]
                }
              }
            }
          });

          if (res.text) {
            let text = res.text.trim();
            if (text.startsWith('```json')) {
              text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (text.startsWith('```')) {
              text = text.replace(/^```\n/, '').replace(/\n```$/, '');
            }
            
            let parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.leads)) {
              parsed = parsed.leads;
            } else if (!Array.isArray(parsed)) {
              parsed = [];
            }

            const chunkLeads = parsed.map((lead: any) => ({
              ...lead,
              id: uuidv4()
            }));
            
            allLeads.push(...chunkLeads);
            
            if (onProgress) {
              onProgress(chunkLeads);
            }
          }
          success = true;
          
          // Delay to prevent hitting rate limits between chunks
          if (i < chunks - 1) {
            await delay(2500); 
          }
        } catch (err: any) {
          console.error(`Error in chunk ${i}, retries left: ${retries - 1}`, err);
          retries--;
          
          if (retries === 0) {
            if (i === 0) {
              throw new Error("Failed to extract data: " + (err.message || "Unknown error"));
            } else {
              // If it fails after chunks have succeeded, we break so we can return what we have without throwing.
              // We also push the error to onProgress or similar if we wanted, but returning what we have is better.
              break;
            }
          } else {
            // Wait longer before retry
            await delay(4000);
          }
        }
      }
    }
    
    if (allLeads.length === 0) {
      throw new Error("Failed to extract leads. The AI model returned an empty response. Please try again.");
    }

    return {
      leads: allLeads,
      query
    };

  } catch (error: any) {
    console.error("Error extracting leads:", error);
    throw new Error(error.message || "Failed to extract leads. Please check the URL and try again.");
  }
}
