"use client";

import { useEffect, useState } from "react";
import type {
  DecisionFeedbackBlock,
  DecisionOptionKey,
  DecisionScenario,
} from "@/types/decision";

function FeedbackSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">
        {label}
      </p>
      <p className="text-sm leading-7 text-gray-700 whitespace-pre-line">{value}</p>
    </div>
  );
}

function FeedbackView({
  scenario,
  selectedOption,
}: {
  scenario: DecisionScenario;
  selectedOption: DecisionOptionKey;
}) {
  const selectedFeedback: DecisionFeedbackBlock = scenario.feedback[selectedOption];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {(["A", "B"] as const).map((optionKey) => {
          const isSelected = optionKey === selectedOption;
          return (
            <div
              key={optionKey}
              className={`rounded-2xl border px-4 py-4 transition-all ${
                isSelected
                  ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-500"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2">
                选择 {optionKey}
              </p>
              <p className="text-sm leading-6">
                {scenario.options[optionKey]}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FeedbackSection label="共情" value={selectedFeedback.empathy} />
        <FeedbackSection label="分析" value={selectedFeedback.analysis} />
        <FeedbackSection label="升级" value={selectedFeedback.upgrade} />
        <FeedbackSection label="行动建议" value={selectedFeedback.action} />
      </div>
    </div>
  );
}

export function DecisionTrainingPanel({
  scenarios,
  onBackToCards,
  onAnswerComplete,
  onComplete,
}: {
  scenarios: DecisionScenario[];
  onBackToCards: () => void;
  onAnswerComplete?: (option: DecisionOptionKey, progress: number) => void;
  onComplete?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<DecisionOptionKey | null>(null);
  const [viewMode, setViewMode] = useState<"scenario" | "feedback" | "done">("scenario");

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setViewMode("scenario");
  }, [scenarios]);

  const currentScenario = scenarios[currentIndex];

  if (!currentScenario) {
    return null;
  }

  const handleSelect = (option: DecisionOptionKey) => {
    setSelectedOption(option);
    setViewMode("feedback");
  };

  const handleNext = () => {
    if (!selectedOption) return;

    const nextProgress = currentIndex + 1;
    onAnswerComplete?.(selectedOption, nextProgress);

    if (currentIndex >= scenarios.length - 1) {
      setViewMode("done");
      onComplete?.();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setViewMode("scenario");
  };

  return (
    <section className="mb-10 rounded-[28px] border border-gray-200 bg-white/95 shadow-card backdrop-blur-sm overflow-hidden transition-all duration-200">
      <div className="border-b border-gray-100 px-6 py-5 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-2">
              决策训练
            </p>
            <h3 className="text-xl font-semibold text-gray-950">
              用真实情境，把书里的认知练成判断力
            </h3>
            <p className="text-sm leading-6 text-gray-500 mt-2">
              先做选择，再看反馈。没有标准答案，重点是看见自己背后的判断习惯。
            </p>
          </div>
          <button
            onClick={onBackToCards}
            className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all"
          >
            返回卡片
          </button>
        </div>
      </div>

      <div className="px-6 py-6 md:px-8 md:py-8">
        {viewMode !== "done" && (
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[11px] font-medium text-gray-500">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-gray-400" />
              场景 {currentIndex + 1} / {scenarios.length}
            </div>
            <p className="text-xs text-gray-400">支持性反馈，不做对错评判</p>
          </div>
        )}

        {viewMode === "scenario" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                {currentScenario.roleType}
              </span>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
                训练能力：{currentScenario.trainingAbility}
              </span>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-gray-50/70 px-5 py-5 md:px-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-3">
                场景
              </p>
              <p className="text-[15px] leading-8 text-gray-700 whitespace-pre-line">
                {currentScenario.scene}
              </p>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white px-5 py-5 md:px-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-3">
                问题
              </p>
              <p className="text-lg font-semibold text-gray-950">
                {currentScenario.question}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {(["A", "B"] as const).map((optionKey) => (
                <button
                  key={optionKey}
                  onClick={() => handleSelect(optionKey)}
                  className="rounded-3xl border border-gray-200 bg-white px-5 py-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-card-hover active:scale-[0.995]"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-3">
                    选项 {optionKey}
                  </p>
                  <p className="text-sm leading-7 text-gray-700">
                    {currentScenario.options[optionKey]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === "feedback" && selectedOption && (
          <div className="space-y-6">
            <FeedbackView
              scenario={currentScenario}
              selectedOption={selectedOption}
            />

            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="rounded-2xl bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-all active:scale-[0.99]"
              >
                {currentIndex < scenarios.length - 1 ? "下一题" : "完成训练"}
              </button>
            </div>
          </div>
        )}

        {viewMode === "done" && (
          <div className="rounded-3xl border border-gray-100 bg-gray-50/70 px-6 py-8 text-center">
            <h4 className="text-2xl font-semibold text-gray-950 mb-3">
              做完了！
            </h4>
            <p className="max-w-xl mx-auto text-sm leading-7 text-gray-600 mb-6">
              你已经把书里的观点带进真实情境里走了一遍。回到卡片时，可以再对照看看：哪些判断是习惯，哪些判断值得升级。
            </p>
            <button
              onClick={onBackToCards}
              className="rounded-2xl bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-all active:scale-[0.99]"
            >
              返回卡片
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
