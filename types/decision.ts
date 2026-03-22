export type DecisionOptionKey = "A" | "B";

export type DecisionFeedbackBlock = {
  empathy: string;
  analysis: string;
  upgrade: string;
  action: string;
};

export type DecisionScenario = {
  id: string;
  bookId: string;
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

function normalizeFeedbackBlock(value: unknown): DecisionFeedbackBlock | null {
  if (!value || typeof value !== "object") return null;

  const block = value as Record<string, unknown>;

  if (
    !isNonEmptyString(block.empathy) ||
    !isNonEmptyString(block.analysis) ||
    !isNonEmptyString(block.upgrade) ||
    !isNonEmptyString(block.action)
  ) {
    return null;
  }

  return {
    empathy: normalizeText(block.empathy),
    analysis: normalizeText(block.analysis),
    upgrade: normalizeText(block.upgrade),
    action: normalizeText(block.action),
  };
}

export function normalizeDecisionScenario(
  value: unknown,
  meta: { id: string; bookId: string }
): DecisionScenario | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const options = candidate.options as Record<string, unknown> | undefined;
  const feedback = candidate.feedback as Record<string, unknown> | undefined;

  if (
    !isNonEmptyString(candidate.scene) ||
    !isNonEmptyString(candidate.question) ||
    !options ||
    !feedback ||
    !isNonEmptyString(options.A) ||
    !isNonEmptyString(options.B)
  ) {
    return null;
  }

  const feedbackA = normalizeFeedbackBlock(feedback.A);
  const feedbackB = normalizeFeedbackBlock(feedback.B);

  if (!feedbackA || !feedbackB) {
    return null;
  }

  return {
    id: meta.id,
    bookId: meta.bookId,
    scene: normalizeText(candidate.scene),
    question: normalizeText(candidate.question),
    options: {
      A: normalizeText(options.A),
      B: normalizeText(options.B),
    },
    feedback: {
      A: feedbackA,
      B: feedbackB,
    },
  };
}

export function normalizeDecisionScenarioList(
  value: unknown,
  bookId: string
): DecisionScenario[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) =>
      normalizeDecisionScenario(item, {
        id: `${bookId}-${index + 1}`,
        bookId,
      })
    )
    .filter((item): item is DecisionScenario => item !== null)
    .slice(0, 3);
}

export function buildDecisionBookId(bookTitle: string): string {
  const normalized = bookTitle.trim().toLowerCase();
  return encodeURIComponent(normalized || "unknown-book");
}

export function getDecisionCacheKey(bookId: string): string {
  return `decision_scenarios_${bookId}`;
}

export function hasCompleteDecisionCards(cards: DecisionCardsInput): boolean {
  return Object.values(cards).every((value) => isNonEmptyString(value));
}
