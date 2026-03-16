import { generateWithOllama } from "@/lib/ollama";
import { READING_GUIDE_PROMPT } from "@/lib/prompts/readingGuide";

type ChapterSummaryItem = {
  index: number;
  title: string;
  summary: string;
};

export async function generateReadingGuide(
  title: string,
  bookSummary: string,
  chapterSummaries: ChapterSummaryItem[]
): Promise<string> {
  const summariesText = chapterSummaries
    .map((item) => `第${item.index}章：${item.title}\n摘要：${item.summary}`)
    .join("\n\n");

  const prompt = READING_GUIDE_PROMPT(title, bookSummary, summariesText);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
