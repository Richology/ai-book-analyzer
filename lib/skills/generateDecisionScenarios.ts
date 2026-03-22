import { generateWithOllama } from "@/lib/ollama";
import { DECISION_TRAINING_PROMPT } from "@/lib/prompts/decisionTraining";
import {
  buildDecisionBookId,
  normalizeDecisionScenario,
  type DecisionCardsInput,
  type DecisionScenario,
} from "@/types/decision";
import { jsonrepair } from "jsonrepair";

const MAX_SCENARIOS = 3;
const MAX_ATTEMPTS = 5;

function extractJsonObject(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("模型未返回 JSON 对象");
  }

  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    return JSON.parse(jsonrepair(match[0])) as unknown;
  }
}

export async function generateDecisionScenarios(
  bookTitle: string,
  cards: DecisionCardsInput
): Promise<DecisionScenario[]> {
  const prompt = DECISION_TRAINING_PROMPT(bookTitle, cards);
  const bookId = buildDecisionBookId(bookTitle);
  const scenarios: DecisionScenario[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < MAX_ATTEMPTS && scenarios.length < MAX_SCENARIOS; attempt += 1) {
    const raw = await generateWithOllama(prompt);
    const parsed = extractJsonObject(raw);
    const scenario = normalizeDecisionScenario(parsed, {
      id: crypto.randomUUID(),
      bookId,
    });

    if (!scenario) {
      continue;
    }

    const dedupeKey = `${scenario.scene}::${scenario.question}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    scenarios.push(scenario);
  }

  if (scenarios.length === 0) {
    throw new Error("未生成有效的决策训练题");
  }

  return scenarios.slice(0, MAX_SCENARIOS);
}
