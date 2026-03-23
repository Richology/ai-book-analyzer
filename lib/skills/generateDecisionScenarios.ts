import { generateWithOllama } from "@/lib/ollama";
import { DECISION_TRAINING_PROMPT } from "@/lib/prompts/decisionTraining";
import {
  buildDecisionBookId,
  parseDecisionScenarioListOrThrow,
  type DecisionCardsInput,
  type DecisionScenario,
} from "@/types/decision";
import { jsonrepair } from "jsonrepair";

const MAX_ATTEMPTS = 3;

function extractJsonArray(raw: string): unknown {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error("模型未返回 JSON 数组");
  }

  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    try {
      return JSON.parse(jsonrepair(match[0])) as unknown;
    } catch {
      throw new Error("模型返回的 JSON 数组无法解析");
    }
  }
}

export async function generateDecisionScenarios(
  bookTitle: string,
  cards: DecisionCardsInput
): Promise<DecisionScenario[]> {
  const prompt = DECISION_TRAINING_PROMPT(bookTitle, cards);
  const bookId = buildDecisionBookId(bookTitle);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = await generateWithOllama(prompt);
      const parsed = extractJsonArray(raw);
      return parseDecisionScenarioListOrThrow(parsed, bookId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("决策训练生成失败");
    }
  }

  throw lastError ?? new Error("未生成有效的决策训练题");
}
