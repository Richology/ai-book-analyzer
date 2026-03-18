import { generateWithOllama } from "@/lib/ollama";
import { BOOK_RECOMMENDATION_PROMPT } from "@/lib/prompts/bookRecommendation";

export async function generateBookRecommendation(
  title: string,
  bookSummary: string,
  readingGuide: string
): Promise<string> {
  const prompt = BOOK_RECOMMENDATION_PROMPT(title, bookSummary, readingGuide);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
