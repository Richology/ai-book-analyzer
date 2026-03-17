import { generateWithOllama } from "@/lib/ollama";
import { IDEA_SOURCE_TRACING_PROMPT } from "@/lib/prompts/ideaSourceTracing";

const FALLBACK = `## 关键思想
暂时无法确定来源

## 可能来源
当前基于已有信息，暂时无法可靠判断这本书的明确思想来源。

## 作者处理方式
从当前内容看，作者可能更偏向经验整合或个人表达，但暂时无法做出更高置信度判断。

## 原创程度判断
暂时无法确定来源，因此无法准确判断其原创程度。

## 总结
当前模型未识别出明确的思想来源，建议在后续结合更完整文本进行判断。`;

export async function generateIdeaSourceTracing(
  title: string,
  bookSummary: string,
  viewMap: string
): Promise<string> {
  const prompt = IDEA_SOURCE_TRACING_PROMPT(title, bookSummary, viewMap);
  const result = await generateWithOllama(prompt);
  const trimmed = result.trim();

  return trimmed || FALLBACK;
}
