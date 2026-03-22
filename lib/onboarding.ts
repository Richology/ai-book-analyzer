export type OnboardingProgress =
  | "none"
  | "analyzed"
  | "trained"
  | "viewed_cards"
  | "exported"
  | "completed";

export const ONBOARDING_STORAGE_KEY = "bookleap_onboarding_step";

const ONBOARDING_ORDER: OnboardingProgress[] = [
  "none",
  "analyzed",
  "viewed_cards",
  "trained",
  "exported",
  "completed",
];

function isOnboardingProgress(value: string): value is OnboardingProgress {
  return ONBOARDING_ORDER.includes(value as OnboardingProgress);
}

export function getOnboardingStep(): OnboardingProgress {
  if (typeof window === "undefined") return "none";

  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw || !isOnboardingProgress(raw)) return "none";
    return raw;
  } catch {
    return "none";
  }
}

export function setOnboardingStep(step: OnboardingProgress) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, step);
  } catch {
    // ignore storage failure
  }
}

export function getOnboardingStepRank(step: OnboardingProgress): number {
  return ONBOARDING_ORDER.indexOf(step);
}

export function isBeforeOnboardingStep(
  currentStep: OnboardingProgress,
  nextStep: OnboardingProgress
): boolean {
  return getOnboardingStepRank(currentStep) < getOnboardingStepRank(nextStep);
}
