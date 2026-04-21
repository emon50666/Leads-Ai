import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyBTHCRxeKfm4gP68hYJdFWmU5jy7Riah4c"
});

export async function generatePersonalizedEmail(lead: any): Promise<string> {
  try {
    const prompt = `Write a short, highly personalized cold outreach email to a business.
    
    Business Name: ${lead.businessName}
    Category: ${lead.category}
    Address: ${lead.address}
    
    The email should be professional, friendly, and offer a generic but valuable service (like digital marketing, web design, or software solutions) tailored slightly to their category. Keep it under 150 words. Do not include placeholder brackets like [Your Name], just write a complete email ready to send.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const generatedText = response.text || "Could not generate email.";
    // Ensure the signature is always exactly this:
    const finalEmail = generatedText.trim().replace(/Best regards(.*?)$/is, '').trim() + "\n\nBest regards,\nMD Emon Talukdar";
    
    return finalEmail;
  } catch (error) {
    console.error("Error generating email:", error);
    throw new Error("Failed to generate personalized email.");
  }
}
