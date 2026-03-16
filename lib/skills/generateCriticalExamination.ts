import { generateWithOllama } from "@/lib/ollama";
import { CRITICAL_EXAMINATION_PROMPT } from "@/lib/prompts/criticalExamination";

type ChapterSummaryItem = {
  index: number;
  title: string;
  summary: string;
};

export async function generateCriticalExamination(
  title: string,
  bookSummary: string,
  chapterSummaries: ChapterSummaryItem[]
): Promise<string> {
  const summariesText = chapterSummaries
    .map((item) => `第${item.index}章：${item.title}\n摘要：${item.summary}`)
    .join("\n\n");

  const prompt = CRITICAL_EXAMINATION_PROMPT(title, bookSummary, summariesText);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
