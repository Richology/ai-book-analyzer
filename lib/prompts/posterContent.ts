export function POSTER_CONTENT_PROMPT(
  title: string,
  bookSummary: string,
  readingGuide: string,
  actionExtraction: string
): string {
  return `You are an expert content writer for social media book sharing.

Based on the analysis of a book, generate structured poster content in Chinese.

Book title: ${title}

Book summary:
${bookSummary}

Reading guide:
${readingGuide}

Action extraction:
${actionExtraction}

---

Generate a JSON object with the following fields:

{
  "hook": "一句话钩子，吸引读者注意力，15-25个中文字",
  "summary": "核心内容概述，3-5句话，120-180个中文字，要有深度和洞察",
  "insights": ["洞察1（40-60个中文字）", "洞察2（40-60个中文字）", "洞察3（40-60个中文字）"],
  "actions": ["行动建议1（30-50个中文字）", "行动建议2（30-50个中文字）", "行动建议3（30-50个中文字）"],
  "highlight": "最有冲击力的一句话，适合作为金句高亮，20-40个中文字"
}

STRICT LENGTH REQUIREMENTS — this is critical:
1. hook: 15-25 Chinese characters. One punchy sentence.
2. summary: 120-180 Chinese characters. Must be 3-5 complete sentences with real substance. Do NOT write a vague 2-sentence summary.
3. insights: EXACTLY 3 items. Each item MUST be 40-60 Chinese characters. Each must be a complete, concrete insight — not a vague phrase.
4. actions: 2-3 items. Each item MUST be 30-50 Chinese characters. Each must be a specific, actionable suggestion.
5. highlight: 20-40 Chinese characters. A memorable quote-worthy sentence.

QUALITY REQUIREMENTS:
- Every item must feel concrete, complete, and insight-rich
- Do NOT output short vague phrases like "提升认知" or "改变思维"
- Each insight should explain WHY or HOW, not just WHAT
- Each action should be specific enough to execute immediately
- The summary should give a reader real understanding of the book's core argument

All content must be in Chinese.
Suitable for Xiaohongshu / WeChat sharing.

Output ONLY the JSON object, no other text.`;
}
