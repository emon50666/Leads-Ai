import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test(modelName: string) {
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: "hello",
    });
    console.log(`Success with ${modelName}:`, res.text);
  } catch (err: any) {
    console.error(`Failed with ${modelName}:`, err.message);
  }
}

async function run() {
  await test("gemini-3-flash-preview");
  await test("gemini-flash-latest");
  await test("gemini-2.5-flash");
}
run();
