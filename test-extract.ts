import { extractLeadsFromUrl } from './src/services/leadExtractor.ts';
import 'dotenv/config';

async function test() {
  try {
    console.log("Starting extraction...");
    const result = await extractLeadsFromUrl('https://www.google.com/maps/search/plumbing+services+in+london', 50, (leads) => {
      console.log(`Progress: got ${leads.length} leads`);
    });
    console.log("Finished:", result.leads.length);
  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
