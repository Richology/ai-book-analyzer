import OpenAI from "openai";

async function generateWithDeepSeek(prompt: string): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message?.content ?? "";
}

async function generateWithOllama(prompt: string): Promise<string> {
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5:3b",
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error("调用 Ollama 失败");
  }

  const data = await response.json();
  return data.response as string;
}

export async function generateWithLLM(prompt: string): Promise<string> {
  if (process.env.VERCEL) {
    return generateWithDeepSeek(prompt);
  }
  return generateWithOllama(prompt);
}
