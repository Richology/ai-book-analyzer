export type AddictionDecisionOption = "A" | "B";

export type AddictionState = {
  viewed_cards_count: number;
  has_triggered_training_prompt: boolean;
  decision_training_progress: number;
  decision_history: AddictionDecisionOption[];
  decision_score: number;
};

export const DEFAULT_ADDICTION_STATE: AddictionState = {
  viewed_cards_count: 0,
  has_triggered_training_prompt: false,
  decision_training_progress: 0,
  decision_history: [],
  decision_score: 0,
};

function getStorageKey(bookId: string): string {
  return `addiction:${bookId}`;
}

function sanitizeState(value: unknown): AddictionState {
  if (!value || typeof value !== "object") {
    return DEFAULT_ADDICTION_STATE;
  }

  const candidate = value as Record<string, unknown>;
  const viewedCardsCount = Number(candidate.viewed_cards_count);
  const decisionTrainingProgress = Number(candidate.decision_training_progress);
  const decisionScore = Number(candidate.decision_score);
  const decisionHistory = Array.isArray(candidate.decision_history)
    ? candidate.decision_history.filter(
        (item): item is AddictionDecisionOption => item === "A" || item === "B"
      )
    : [];

  return {
    viewed_cards_count: Number.isFinite(viewedCardsCount)
      ? Math.max(0, Math.min(999, Math.floor(viewedCardsCount)))
      : 0,
    has_triggered_training_prompt: candidate.has_triggered_training_prompt === true,
    decision_training_progress: Number.isFinite(decisionTrainingProgress)
      ? Math.max(0, Math.min(999, Math.floor(decisionTrainingProgress)))
      : 0,
    decision_history: decisionHistory,
    decision_score: Number.isFinite(decisionScore)
      ? Math.max(0, Math.min(999, Math.floor(decisionScore)))
      : 0,
  };
}

export function getAddictionState(bookId?: string | null): AddictionState {
  if (typeof window === "undefined" || !bookId) {
    return DEFAULT_ADDICTION_STATE;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(bookId));
    if (!raw) return DEFAULT_ADDICTION_STATE;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return DEFAULT_ADDICTION_STATE;
  }
}

export function setAddictionState(
  bookId: string | null | undefined,
  nextState: AddictionState
): void {
  if (typeof window === "undefined" || !bookId) return;

  try {
    localStorage.setItem(getStorageKey(bookId), JSON.stringify(sanitizeState(nextState)));
  } catch {
    // ignore storage failures
  }
}

export function updateAddictionState(
  bookId: string | null | undefined,
  updater: (prev: AddictionState) => AddictionState
): AddictionState {
  const prev = getAddictionState(bookId);
  const next = sanitizeState(updater(prev));

  if (bookId) {
    setAddictionState(bookId, next);
  }

  return next;
}

export function resetDecisionRound(bookId: string | null | undefined): AddictionState {
  return updateAddictionState(bookId, (prev) => ({
    ...prev,
    decision_training_progress: 0,
    decision_history: [],
  }));
}

export function inferDecisionPattern(history: AddictionDecisionOption[]): string | null {
  if (history.length < 3) return null;

  const countA = history.filter((item) => item === "A").length;
  const countB = history.filter((item) => item === "B").length;

  if (countA >= 2) {
    return "你在关键时刻更倾向选择短期舒适路径\n这不是偶然，而是你的决策习惯";
  }

  if (countB >= 2) {
    return "你在关键时刻更倾向选择长期更优解\n这不是偶然，而是你的决策习惯";
  }

  return null;
}
