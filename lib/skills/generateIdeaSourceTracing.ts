import { generateWithOllama } from "@/lib/ollama";
import { IDEA_SOURCE_TRACING_PROMPT } from "@/lib/prompts/ideaSourceTracing";

type ChapterSummaryItem = {
  index: number;
  title: string;
  summary: string;
};

export async function generateIdeaSourceTracing(
  title: string,
  bookSummary: string,
  chapterSummaries: ChapterSummaryItem[]
): Promise<string> {
  const summariesText = chapterSummaries
    .map((item) => `第${item.index}章：${item.title}\n摘要：${item.summary}`)
    .join("\n\n");

  const prompt = IDEA_SOURCE_TRACING_PROMPT(title, bookSummary, summariesText);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
