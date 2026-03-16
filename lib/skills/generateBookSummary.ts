import { generateWithOllama } from "@/lib/ollama";
import { BOOK_SUMMARY_PROMPT } from "@/lib/prompts/bookSummary";

type ChapterSummaryItem = {
  index: number;
  title: string;
  summary: string;
};

export async function generateBookSummary(
  title: string,
  chapterSummaries: ChapterSummaryItem[]
): Promise<string> {
  const summariesText = chapterSummaries
    .map((item) => `第${item.index}章：${item.title}\n摘要：${item.summary}`)
    .join("\n\n");

  const prompt = BOOK_SUMMARY_PROMPT(title, summariesText);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
