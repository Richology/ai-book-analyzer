import { generateWithOllama } from "@/lib/ollama";
import { CHAPTER_SUMMARY_PROMPT } from "@/lib/prompts/chapterSummary";

type ChapterInput = {
  id: string;
  title: string;
  text: string;
};

type ChapterWithSummary = ChapterInput & {
  summary: string;
};

export async function generateChapterSummaries(
  chapters: ChapterInput[]
): Promise<ChapterWithSummary[]> {
  return Promise.all(
    chapters.map(async (chapter, index) => {
      if (index > 2) {
        return {
          ...chapter,
          summary: "为保证速度，当前版本暂未生成这一章的摘要。",
        };
      }

      const prompt = CHAPTER_SUMMARY_PROMPT(chapter.title, chapter.text);
      const result = await generateWithOllama(prompt);

      return {
        ...chapter,
        summary: result.trim(),
      };
    })
  );
}
