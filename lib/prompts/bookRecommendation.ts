export function BOOK_RECOMMENDATION_PROMPT(
  title: string,
  bookSummary: string,
  readingGuide: string
): string {
  return `You are an expert in knowledge distillation and book recommendation.

Based on the content of a book, generate a concise and compelling recommendation text in Chinese.

Requirements:

1. Length: 200–300 Chinese characters
2. Structure:
   - One sentence: core value of the book
   - What problem the book solves
   - Who should read it
   - What readers will gain

3. Style:
   - Clear, insightful, and persuasive
   - No fluff, no repetition
   - Suitable for social sharing

4. Output should be:
   - Well-structured paragraphs
   - Easy to read on a shareable card

Do NOT:
- list bullet points
- include raw excerpts
- make it too long

Return only the final recommendation text.

Book title: ${title}

Book summary:
${bookSummary}

Reading guide excerpt:
${readingGuide.slice(0, 600)}
`;
}
