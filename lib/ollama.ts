export async function generateWithOllama(prompt: string) {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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