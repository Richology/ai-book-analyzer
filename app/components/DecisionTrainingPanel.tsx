"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DecisionFeedbackBlock,
  DecisionOptionKey,
  DecisionScenario,
} from "@/types/decision";

function StyledFeedbackSection({
  label,
  value,
  variant,
  icon,
}: {
  label: string;
  value: string;
  variant: "empathy" | "analysis" | "upgrade" | "action";
  icon: string;
}) {
  const styles = {
    empathy: {
      wrap: "bg-orange-50/80 border-orange-100/60 text-orange-900",
      label: "text-orange-500",
    },
    analysis: {
      wrap: "bg-blue-50/80 border-blue-100/60 text-blue-900",
      label: "text-blue-500",
    },
    upgrade: {
      wrap: "bg-gray-900 border-gray-800 text-gray-100 shadow-xl",
      label: "text-gray-400",
    },
    action: {
      wrap: "bg-emerald-50/80 border-emerald-100/60 text-emerald-900",
      label: "text-emerald-500",
    },
  };

  const s = styles[variant];

  return (
    <div className={`rounded-3xl border px-6 py-6 transition-all ${s.wrap}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <p className={`text-[11px] font-bold uppercase tracking-widest ${s.label}`}>
          {label}
        </p>
      </div>
      <p className="text-[15px] leading-8 whitespace-pre-line opacity-90">{value}</p>
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
    <div className="space-y-6">
      {/* Selected Option Mini Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-2">
          您选择了 {selectedOption}
        </p>
        <p className="text-[15px] leading-7 text-gray-700">
          {scenario.options[selectedOption]}
        </p>
      </div>

      {/* The 4 progression blocks arranged vertically */}
      <div className="flex flex-col gap-4">
        <StyledFeedbackSection 
          label="共情" 
          icon="💭" 
          value={selectedFeedback.empathy} 
          variant="empathy" 
        />
        <StyledFeedbackSection 
          label="深度分析" 
          icon="🔍" 
          value={selectedFeedback.analysis} 
          variant="analysis" 
        />
        <StyledFeedbackSection 
          label="认知升级" 
          icon="✨" 
          value={selectedFeedback.upgrade} 
          variant="upgrade" 
        />
        <StyledFeedbackSection 
          label="破局行动" 
          icon="🎯" 
          value={selectedFeedback.action} 
          variant="action" 
        />
      </div>
    </div>
  );
}

export function DecisionTrainingPanel({
  scenarios,
  onBackToCards,
  onAnswerComplete,
  onComplete,
  onUpgradeClick,
}: {
  scenarios: DecisionScenario[];
  onBackToCards: () => void;
  onAnswerComplete?: (option: DecisionOptionKey, progress: number) => void;
  onComplete?: () => void;
  onUpgradeClick?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<DecisionOptionKey | null>(null);
  const [viewMode, setViewMode] = useState<"scenario" | "feedback" | "done">("scenario");
  
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setViewMode("scenario");
  }, [scenarios]);
  
  // Auto scroll window to panel top when changing views
  useEffect(() => {
    if (panelRef.current) {
      // scrollIntoView with a slight top margin is handled by scroll-margin-top if defined in css,
      // but standard scrollIntoView is highly reliable here.
      const yOffset = -80; // offset for sticky navbars if any
      const element = panelRef.current;
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [viewMode, currentIndex]);

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
    <section 
      ref={panelRef}
      className="mb-10 rounded-[28px] border border-gray-200 bg-white shadow-card overflow-hidden relative w-full"
    >
      
      {/* Universal Compact Header */}
      <div className="border-b border-gray-100 bg-white/80 px-5 py-4 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <button
          onClick={onBackToCards}
          className="rounded-xl bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-all flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          退出训练
        </button>
        {viewMode !== "done" && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              PROGRESS
            </span>
            <span className="flex items-center justify-center bg-gray-900 text-white text-[11px] font-bold rounded-full w-6 h-6 leading-none">
              {currentIndex + 1}
            </span>
            <span className="text-gray-300 text-[11px] font-bold">/</span>
            <span className="text-gray-400 text-[11px] font-bold">
              {scenarios.length}
            </span>
          </div>
        )}
      </div>

      {/* Internal Viewport (No internal scrolling) */}
      <div className="px-5 py-6 md:px-8 md:py-8">
        {viewMode === "scenario" && (
          <div className="space-y-8 pb-4">
            
            {/* Context Narrative Block */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold tracking-wider text-gray-600 uppercase">
                  {currentScenario.roleType}
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500">
                  训练能力：{currentScenario.trainingAbility}
                </span>
              </div>

              <div className="rounded-r-[24px] rounded-bl-[24px] border-l-[3px] border-l-gray-900 bg-gray-50/60 p-6 md:p-8">
                <p className="text-[16px] leading-8 text-gray-700 whitespace-pre-line mb-6">
                  {currentScenario.scene}
                </p>
                <div className="h-px w-full bg-gray-200/60 mb-6"></div>
                <p className="text-[18px] md:text-xl font-bold text-gray-900 leading-snug">
                  🤔 {currentScenario.question}
                </p>
              </div>
            </div>

            {/* Vertical Options */}
            <div className="flex flex-col gap-4">
              {(["A", "B"] as const).map((optionKey) => (
                <button
                  key={optionKey}
                  onClick={() => handleSelect(optionKey)}
                  className="group relative flex w-full items-start gap-4 rounded-[20px] border border-gray-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-900 hover:shadow-card-hover active:scale-[0.995]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-500 transition-colors group-hover:bg-gray-900 group-hover:text-white mt-0.5">
                    {optionKey}
                  </div>
                  <p className="text-[15px] leading-relaxed text-gray-700 group-hover:text-gray-900 pt-0.5 flex-1">
                    {currentScenario.options[optionKey]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === "feedback" && selectedOption && (
          <div className="space-y-8 pb-4">
            <FeedbackView
              scenario={currentScenario}
              selectedOption={selectedOption}
            />

            <div className="flex justify-end border-t border-gray-100 pt-6">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 rounded-2xl bg-gray-900 px-7 py-3.5 text-[15px] font-semibold text-white shadow-md hover:bg-gray-800 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
              >
                {currentIndex < scenarios.length - 1 ? "下一题" : "完成训练"}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}

        {viewMode === "done" && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-gray-50/50 px-6 py-12 text-center my-auto min-h-[400px]">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </div>
            
            <h4 className="text-2xl font-bold text-gray-900 mb-4">
              做完了！
            </h4>
            
            <p className="max-w-md mx-auto text-[15px] leading-7 text-gray-600 mb-8">
              你已经把书里的观点带进真实情境里走了一遍。回到卡片时，可以再对照看看：哪些判断是习惯，哪些判断值得升级。
            </p>
            
            <button
              onClick={onBackToCards}
              className="rounded-2xl bg-gray-900 px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-gray-800 shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              返回卡片
            </button>
            
            {onUpgradeClick && (
              <div className="mt-10 flex w-full max-w-sm flex-col items-center justify-center border-t border-gray-200/60 pt-8">
                <p className="text-[11px] font-bold text-gray-400 mb-4 uppercase tracking-widest">进阶提升</p>
                <button
                  onClick={onUpgradeClick}
                  className="group flex w-full flex-col sm:flex-row items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 border border-gray-200 shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2 text-[15px] font-bold text-gray-900">
                    <span className="text-xl">🎁</span>
                    免费获取破局书单
                  </span>
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span className="text-[13px] font-medium text-gray-500 group-hover:text-gray-700">主理人 1v1 答疑</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
