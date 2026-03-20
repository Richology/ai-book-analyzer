import { generateWithOllama } from "@/lib/ollama";
import { POSTER_CONTENT_PROMPT } from "@/lib/prompts/posterContent";

export type PosterContent = {
  hook: string;
  summary: string;
  insights: string[];
  actions: string[];
  highlight: string;
};

export async function generatePosterContent(
  title: string,
  bookSummary: string,
  readingGuide: string,
  actionExtraction: string
): Promise<PosterContent> {
  const prompt = POSTER_CONTENT_PROMPT(
    title,
    bookSummary,
    readingGuide,
    actionExtraction
  );
  const raw = await generateWithOllama(prompt);

  // Extract JSON from response (may have markdown fences)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse poster content JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as PosterContent;

  // Validate & fallback
  return {
    hook: parsed.hook || "一本值得深读的好书",
    summary: parsed.summary || "",
    insights: Array.isArray(parsed.insights)
      ? parsed.insights.slice(0, 3)
      : [],
    actions: Array.isArray(parsed.actions)
      ? parsed.actions.slice(0, 3)
      : [],
    highlight: parsed.highlight || parsed.hook || "",
  };
}
