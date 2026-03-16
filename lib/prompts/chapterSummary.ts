export function CHAPTER_SUMMARY_PROMPT(title: string, text: string): string {
  return `
你是一位严谨的阅读分析助手。

请根据下面的章节内容，生成一段简洁的章节摘要。

要求：
1. 使用中文
2. 控制在 80-150 字
3. 只提炼核心内容
4. 不要空话
5. 不要使用"本章主要讲了"这种很机械的话

章节标题：
${title}

章节内容：
${text.slice(0, 2000)}
`;
}
