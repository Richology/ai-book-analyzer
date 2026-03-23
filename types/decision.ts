export type DecisionOptionKey = "A" | "B";

export const DECISION_ROLE_TYPES = ["职场执行者", "个人成长者", "决策者"] as const;

export type DecisionRoleType = (typeof DECISION_ROLE_TYPES)[number];

export const DECISION_SCENARIO_COUNT = DECISION_ROLE_TYPES.length;

export type DecisionFeedbackBlock = {
  empathy: string;
  analysis: string;
  upgrade: string;
  action: string;
};

export type DecisionScenario = {
  id: string;
  bookId: string;
  roleType: DecisionRoleType;
  trainingAbility: string;
  scene: string;
  question: string;
  options: {
    A: string;
    B: string;
  };
  feedback: {
    A: DecisionFeedbackBlock;
    B: DecisionFeedbackBlock;
  };
};

export type DecisionCardsInput = {
  summary: string;
  readingGuide: string;
  viewMap: string;
  actionPrinciples: string;
  models: string;
  insights: string;
};

export type DecisionGenerateRequestBody = {
  bookTitle: string;
  cards: DecisionCardsInput;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: string): string {
  return value.trim();
}

function isDecisionRoleType(value: string): value is DecisionRoleType {
  return (DECISION_ROLE_TYPES as readonly string[]).includes(value);
}

function normalizeRoleType(value: unknown): DecisionRoleType | null {
  if (!isNonEmptyString(value)) return null;

  const normalized = normalizeText(value);
  return isDecisionRoleType(normalized) ? normalized : null;
}

function normalizeFeedbackBlock(
  value: unknown,
  path: string
): { block: DecisionFeedbackBlock | null; errors: string[] } {
  if (!value || typeof value !== "object") {
    return {
      block: null,
      errors: [`${path} 不是对象`],
    };
  }

  const block = value as Record<string, unknown>;
  const missingFields = ["empathy", "analysis", "upgrade", "action"].filter(
    (field) => !isNonEmptyString(block[field])
  );

  if (missingFields.length > 0) {
    return {
      block: null,
      errors: [`${path} 缺少 ${missingFields.join("、")}`],
    };
  }

  return {
    block: {
      empathy: normalizeText(block.empathy as string),
      analysis: normalizeText(block.analysis as string),
      upgrade: normalizeText(block.upgrade as string),
      action: normalizeText(block.action as string),
    },
    errors: [],
  };
}

type NormalizeDecisionScenarioResult = {
  scenario: DecisionScenario | null;
  errors: string[];
};

function normalizeDecisionScenarioInternal(
  value: unknown,
  meta: { id: string; bookId: string; index: number }
): NormalizeDecisionScenarioResult {
  const sceneLabel = `第 ${meta.index + 1} 个场景`;

  if (!value || typeof value !== "object") {
    return {
      scenario: null,
      errors: [`${sceneLabel} 不是对象`],
    };
  }

  const candidate = value as Record<string, unknown>;
  const options = candidate.options as Record<string, unknown> | undefined;
  const feedback = candidate.feedback as Record<string, unknown> | undefined;
  const roleType = normalizeRoleType(candidate.roleType);
  const trainingAbility = isNonEmptyString(candidate.trainingAbility)
    ? normalizeText(candidate.trainingAbility)
    : "";
  const scene = isNonEmptyString(candidate.scene) ? normalizeText(candidate.scene) : "";
  const question = isNonEmptyString(candidate.question)
    ? normalizeText(candidate.question)
    : "";
  const optionA = options && isNonEmptyString(options.A) ? normalizeText(options.A) : "";
  const optionB = options && isNonEmptyString(options.B) ? normalizeText(options.B) : "";
  const feedbackAResult = normalizeFeedbackBlock(feedback?.A, `${sceneLabel}的 feedback.A`);
  const feedbackBResult = normalizeFeedbackBlock(feedback?.B, `${sceneLabel}的 feedback.B`);
  const errors: string[] = [];

  if (!roleType) {
    errors.push(`${sceneLabel}缺少合法的 roleType`);
  }

  if (!trainingAbility) {
    errors.push(`${sceneLabel}缺少 trainingAbility`);
  }

  if (!scene) {
    errors.push(`${sceneLabel}缺少 scene`);
  }

  if (!question) {
    errors.push(`${sceneLabel}缺少 question`);
  }

  if (!options || typeof options !== "object") {
    errors.push(`${sceneLabel}缺少 options`);
  } else {
    if (!optionA) {
      errors.push(`${sceneLabel}缺少 options.A`);
    }

    if (!optionB) {
      errors.push(`${sceneLabel}缺少 options.B`);
    }
  }

  if (!feedback || typeof feedback !== "object") {
    errors.push(`${sceneLabel}缺少 feedback`);
  }

  errors.push(...feedbackAResult.errors, ...feedbackBResult.errors);

  if (
    errors.length > 0 ||
    !roleType ||
    !trainingAbility ||
    !scene ||
    !question ||
    !optionA ||
    !optionB ||
    !feedbackAResult.block ||
    !feedbackBResult.block
  ) {
    return {
      scenario: null,
      errors,
    };
  }

  return {
    scenario: {
      id: meta.id,
      bookId: meta.bookId,
      roleType,
      trainingAbility,
      scene,
      question,
      options: {
        A: optionA,
        B: optionB,
      },
      feedback: {
        A: feedbackAResult.block,
        B: feedbackBResult.block,
      },
    },
    errors: [],
  };
}

function parseDecisionScenarioList(
  value: unknown,
  bookId: string
): { scenarios: DecisionScenario[]; errors: string[] } {
  if (!Array.isArray(value)) {
    return {
      scenarios: [],
      errors: ["模型返回的决策训练不是 JSON 数组"],
    };
  }

  if (value.length !== DECISION_SCENARIO_COUNT) {
    return {
      scenarios: [],
      errors: [
        `模型返回了 ${value.length} 个场景，需要 ${DECISION_SCENARIO_COUNT} 个场景`,
      ],
    };
  }

  const scenarios: DecisionScenario[] = [];
  const errors: string[] = [];
  const seenRoleTypes = new Set<DecisionRoleType>();
  const seenScenarioKeys = new Set<string>();

  value.forEach((item, index) => {
    const result = normalizeDecisionScenarioInternal(item, {
      id: `${bookId}-${index + 1}`,
      bookId,
      index,
    });

    if (!result.scenario) {
      errors.push(...result.errors);
      return;
    }

    const scenario = result.scenario;
    const dedupeKey = `${scenario.scene}::${scenario.question}`;

    if (seenRoleTypes.has(scenario.roleType)) {
      errors.push(`角色类型 ${scenario.roleType} 重复，3 个场景必须各不相同`);
      return;
    }

    if (seenScenarioKeys.has(dedupeKey)) {
      errors.push(`第 ${index + 1} 个场景与其他场景重复`);
      return;
    }

    seenRoleTypes.add(scenario.roleType);
    seenScenarioKeys.add(dedupeKey);
    scenarios.push(scenario);
  });

  if (errors.length > 0) {
    return {
      scenarios: [],
      errors,
    };
  }

  const missingRoleTypes = DECISION_ROLE_TYPES.filter(
    (roleType) => !seenRoleTypes.has(roleType)
  );

  if (missingRoleTypes.length > 0) {
    return {
      scenarios: [],
      errors: [
        `3 个场景必须覆盖 ${DECISION_ROLE_TYPES.join("、")}，当前缺少 ${missingRoleTypes.join("、")}`,
      ],
    };
  }

  return {
    scenarios,
    errors: [],
  };
}

export function normalizeDecisionScenario(
  value: unknown,
  meta: { id: string; bookId: string }
): DecisionScenario | null {
  return normalizeDecisionScenarioInternal(value, {
    ...meta,
    index: 0,
  }).scenario;
}

export function normalizeDecisionScenarioList(
  value: unknown,
  bookId: string
): DecisionScenario[] {
  return parseDecisionScenarioList(value, bookId).scenarios;
}

export function parseDecisionScenarioListOrThrow(
  value: unknown,
  bookId: string
): DecisionScenario[] {
  const { scenarios, errors } = parseDecisionScenarioList(value, bookId);

  if (errors.length > 0) {
    throw new Error(errors.join("；"));
  }

  return scenarios;
}

export function buildDecisionBookId(bookTitle: string): string {
  const normalized = bookTitle.trim().toLowerCase();
  return encodeURIComponent(normalized || "unknown-book");
}

export function getDecisionCacheKey(bookId: string): string {
  return `decision_scenarios_v2_${bookId}`;
}

export function getLegacyDecisionCacheKey(bookId: string): string {
  return `decision_scenarios_${bookId}`;
}

export function hasCompleteDecisionCards(cards: DecisionCardsInput): boolean {
  return Object.values(cards).every((value) => isNonEmptyString(value));
}
