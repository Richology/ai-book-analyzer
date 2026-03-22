"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { BookShareModal } from "./components/BookShareModal";
import {
  ExportModal,
  type ExportParams,
  type ExportSection,
} from "./components/ExportModal";
import { PosterPreviewModal } from "./components/poster/PosterPreviewModal";
import type { PosterContent } from "./components/poster/types";
import { DecisionTrainingPanel } from "./components/DecisionTrainingPanel";
import { Toast } from "./components/Toast";
import {
  buildDecisionBookId,
  getDecisionCacheKey,
  hasCompleteDecisionCards,
  normalizeDecisionScenarioList,
  type DecisionCardsInput,
  type DecisionScenario,
} from "@/types/decision";
import {
  getOnboardingStep,
  isBeforeOnboardingStep,
  setOnboardingStep as persistOnboardingStep,
  type OnboardingProgress,
} from "@/lib/onboarding";

type Chapter = {
  id: string;
  title: string;
  text: string;
  summary?: string;
};

type ImmersiveCardDef = {
  key: string;
  label: string;
  content: string;
  isLoading: boolean;
  loadingText: string;
};

type ShareModalState = {
  label: string;
  content: string;
  bookTitle: string;
} | null;

type GuidanceToast = {
  id: string;
  message: string | ReactNode;
  actionText?: string;
  onAction?: () => void;
  durationMs?: number;
};

// ── Share card content helpers ─────────────────────────────────────────────────

// ── Recent history (localStorage) ─────────────────────────────────────────────
const HISTORY_KEY = "bookleap_recent_history";
const HISTORY_MAX = 10;

type HistoryRecord = {
  id: string;
  title: string;
  fileType: string;
  mode: "full" | "lite";
  createdAt: string;
  bookSummary: string;
  readingGuide: string;
  viewMap: string;
  actionExtraction: string;
  viewValidation: string;
  ideaSourceTracing: string;
  bookRecommendation: string;
  posterContent?: PosterContent | null;
};

function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(records: HistoryRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, HISTORY_MAX)));
  } catch { /* quota exceeded – silently ignore */ }
}

function loadDecisionScenarioCache(bookId: string): DecisionScenario[] {
  try {
    const raw = localStorage.getItem(getDecisionCacheKey(bookId));
    if (!raw) return [];
    return normalizeDecisionScenarioList(JSON.parse(raw), bookId);
  } catch {
    return [];
  }
}

function saveDecisionScenarioCache(bookId: string, scenarios: DecisionScenario[]) {
  try {
    localStorage.setItem(getDecisionCacheKey(bookId), JSON.stringify(scenarios));
  } catch {
    // silently ignore cache failures
  }
}

// ── Share card content helpers (continued) ────────────────────────────────────
type ShareItem = { type: "heading" | "bullet" | "para"; text: string };

function cleanInlineMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

function parseShareItems(md: string): ShareItem[] {
  const items: ShareItem[] = [];
  for (const line of md.split("\n")) {
    const t = line.trim();
    if (!t || /^[-=*]{3,}$/.test(t)) continue;
    const hMatch = t.match(/^#{1,6}\s+(.+)/);
    if (hMatch) { items.push({ type: "heading", text: cleanInlineMd(hMatch[1]) }); continue; }
    const bMatch = t.match(/^[-*+]\s+(.+)/);
    if (bMatch) { items.push({ type: "bullet",  text: cleanInlineMd(bMatch[1])  }); continue; }
    const nMatch = t.match(/^\d+\.\s+(.+)/);
    if (nMatch) { items.push({ type: "bullet",  text: cleanInlineMd(nMatch[1])  }); continue; }
    if (t.length > 4) items.push({ type: "para", text: cleanInlineMd(t) });
  }
  return items;
}

// ── Share Card Modal ──────────────────────────────────────────────────────────
const CARD_W = 540;
const CARD_FONT = "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

function ShareModal({
  data,
  onClose,
}: {
  data: NonNullable<ShareModalState>;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Show ALL parsed items – no truncation
  const items = parseShareItems(data.content);

  const handleSave = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      // Let html2canvas measure the element's natural dimensions
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      const safeName = `${data.bookTitle.slice(0, 16)}-${data.label}-书跃`.replace(/[/\\:*?"<>|]/g, "");
      a.download = `${safeName}.png`;
      a.click();
    } catch (err) {
      console.error("保存失败:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        padding: "20px 16px",
        fontFamily: CARD_FONT,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal shell */}
      <div
        style={{
          width: "100%",
          maxWidth: 596,
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 32px 96px rgba(0,0,0,0.28)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #f3f4f6",
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>
            分享卡片预览
          </p>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: "flex",
              alignItems: "center", justifyContent: "center",
              borderRadius: "50%", border: "none",
              background: "transparent", cursor: "pointer",
              color: "#9ca3af", fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable preview area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "auto",
            padding: "24px 28px",
            background: "#f4f4f5",
          }}
        >
          {/* ── Dedicated share card (the element captured by html2canvas) ── */}
          <div
            ref={cardRef}
            style={{
              width: CARD_W,
              /* No fixed height – expands to fit full content */
              background: "#ffffff",
              borderRadius: 20,
              boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
              fontFamily: CARD_FONT,
              display: "flex",
              flexDirection: "column",
              margin: "0 auto",
            }}
          >
            {/* ── Top: dark branded header ── */}
            <div
              style={{
                background: "linear-gradient(150deg,#0f172a 0%,#1e293b 100%)",
                padding: "28px 36px 26px",
                borderRadius: "20px 20px 0 0",
              }}
            >
              {/* Brand + slogan – single quiet line */}
              <p
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  margin: "0 0 14px 0",
                  lineHeight: 1,
                }}
              >
                书跃 · BookLeap &nbsp;·&nbsp; 从好书中完成认知跃迁
              </p>

              {/* Book title – the most prominent element */}
              <p
                style={{
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  margin: "0 0 16px 0",
                  letterSpacing: "0.01em",
                  wordBreak: "break-all",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {data.bookTitle}
              </p>

              {/* Section label pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 20,
                  padding: "4px 14px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.88)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                  }}
                >
                  {data.label}
                </span>
              </div>
            </div>

            {/* ── Middle: content – no overflow clipping, no fixed height ── */}
            <div
              style={{
                padding: "28px 36px 24px",
                background: "#ffffff",
              }}
            >
              {items.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                  暂无内容
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {items.map((item, i) => {
                    if (item.type === "heading") {
                      return (
                        <p
                          key={i}
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#111827",
                            lineHeight: 1.55,
                            margin: "0 0 10px 0",
                            padding: 0,
                          }}
                        >
                          {item.text}
                        </p>
                      );
                    }
                    if (item.type === "bullet") {
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            marginBottom: 11,
                          }}
                        >
                          <span
                            style={{
                              color: "#cbd5e1",
                              fontSize: 18,
                              lineHeight: 1.45,
                              flexShrink: 0,
                              fontWeight: 300,
                              marginTop: 0,
                            }}
                          >
                            ·
                          </span>
                          <span
                            style={{
                              fontSize: 13.5,
                              color: "#374151",
                              lineHeight: 1.72,
                              wordBreak: "break-all",
                            }}
                          >
                            {item.text}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <p
                        key={i}
                        style={{
                          fontSize: 13.5,
                          color: "#374151",
                          lineHeight: 1.78,
                          margin: "0 0 11px 0",
                          padding: 0,
                          wordBreak: "break-all",
                        }}
                      >
                        {item.text}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Bottom: footer with logo – sits right below content ── */}
            <div
              style={{
                padding: "14px 36px 24px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#ffffff",
                borderRadius: "0 0 20px 20px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Richology%E5%95%86%E6%A0%87%E9%BB%91%E4%BD%93.png"
                alt="Richology"
                style={{ height: 16, opacity: 0.28, objectFit: "contain" }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            gap: 12,
            padding: "16px 24px",
            borderTop: "1px solid #f3f4f6",
            background: "#ffffff",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "transparent",
              padding: "10px 0",
              fontSize: 14,
              color: "#6b7280",
              cursor: "pointer",
              fontFamily: CARD_FONT,
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              borderRadius: 12,
              border: "none",
              background: isSaving ? "#9ca3af" : "#111827",
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              cursor: isSaving ? "default" : "pointer",
              fontFamily: CARD_FONT,
            }}
          >
            {isSaving ? "保存中…" : "保存图片"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartXRef = useRef(0);
  const immersiveCardsLenRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [readingGuide, setReadingGuide] = useState("");
  const [viewMap, setViewMap] = useState("");
  const [actionExtraction, setActionExtraction] = useState("");
  const [criticalExamination, setCriticalExamination] = useState("");
  const [ideaSourceTracing, setIdeaSourceTracing] = useState("");
  const [bookSummary, setBookSummary] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBookSummary, setIsLoadingBookSummary] = useState(false);
  const [isLoadingReadingGuide, setIsLoadingReadingGuide] = useState(false);
  const [isLoadingViewMap, setIsLoadingViewMap] = useState(false);
  const [isLoadingActionExtraction, setIsLoadingActionExtraction] = useState(false);
  const [isLoadingViewValidation, setIsLoadingViewValidation] = useState(false);
  const [isLoadingIdeaSourceTracing, setIsLoadingIdeaSourceTracing] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success">("idle");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [isLiteUnlocked, setIsLiteUnlocked] = useState(false);
  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"card" | "immersive">("immersive");
  const [immersiveIndex, setImmersiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [shareModal, setShareModal] = useState<ShareModalState>(null);
  const [bookRecommendation, setBookRecommendation] = useState("");
  const [isBookShareModalOpen, setIsBookShareModalOpen] = useState(false);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [posterContent, setPosterContent] = useState<PosterContent | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [decisionScenarios, setDecisionScenarios] = useState<DecisionScenario[]>([]);
  const [isDecisionPanelOpen, setIsDecisionPanelOpen] = useState(false);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [activeToast, setActiveToast] = useState<GuidanceToast | null>(null);
  const [toastQueue, setToastQueue] = useState<GuidanceToast[]>([]);
  const [lastToastClosedAt, setLastToastClosedAt] = useState(0);
  const [onboardingProgress, setOnboardingProgressState] = useState<OnboardingProgress>("none");
  const [seenCardKeys, setSeenCardKeys] = useState<string[]>([]);

  const cardSectionRef = useRef<HTMLDivElement>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryRecord[]>([]);
  const [historyToast, setHistoryToast] = useState("");

  const isAnalyzing =
    isLoading ||
    isLoadingBookSummary ||
    isLoadingReadingGuide ||
    isLoadingViewMap ||
    isLoadingActionExtraction ||
    isLoadingViewValidation ||
    isLoadingIdeaSourceTracing;

  // Load history + onboarding progress on mount
  useEffect(() => {
    setRecentHistory(loadHistory());
    setOnboardingProgressState(getOnboardingStep());
  }, []);

  // Save to history when analysis completes
  useEffect(() => {
    if (message !== "分析完成" || isAnalyzing || !bookTitle) return;
    const fileType = selectedFile?.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub";
    const record: HistoryRecord = {
      id: `${bookTitle}-${fileType}`,
      title: bookTitle,
      fileType,
      mode: isLiteMode && !isLiteUnlocked ? "lite" : "full",
      createdAt: new Date().toISOString(),
      bookSummary,
      readingGuide,
      viewMap,
      actionExtraction,
      viewValidation: criticalExamination,
      ideaSourceTracing,
      bookRecommendation,
      posterContent: posterContent ?? null,
    };
    const prev = loadHistory().filter((r) => r.id !== record.id);
    const next = [record, ...prev].slice(0, HISTORY_MAX);
    saveHistory(next);
    setRecentHistory(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, isAnalyzing]);

  const advanceOnboardingProgress = useCallback((nextStep: OnboardingProgress) => {
    setOnboardingProgressState((prev) => {
      if (!isBeforeOnboardingStep(prev, nextStep)) {
        return prev;
      }
      persistOnboardingStep(nextStep);
      return nextStep;
    });
  }, []);

  const enqueueGuidanceToast = useCallback((toast: GuidanceToast) => {
    setToastQueue((prev) => {
      if (activeToast?.id === toast.id || prev.some((item) => item.id === toast.id)) {
        return prev;
      }
      return [...prev, toast];
    });
  }, [activeToast]);

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) return;

    const remainingDelay = Math.max(0, 10000 - (Date.now() - lastToastClosedAt));
    const timer = window.setTimeout(() => {
      setActiveToast(toastQueue[0]);
      setToastQueue((prev) => prev.slice(1));
    }, remainingDelay);

    return () => window.clearTimeout(timer);
  }, [activeToast, toastQueue, lastToastClosedAt]);

  const restoreFromHistory = (record: HistoryRecord) => {
    if (isAnalyzing) {
      setHistoryToast("当前正在分析，请稍后查看历史记录");
      setTimeout(() => setHistoryToast(""), 2500);
      return;
    }
    resetAllState();
    setSelectedFile(null);
    setBookTitle(record.title);
    setBookSummary(record.bookSummary);
    setReadingGuide(record.readingGuide);
    setViewMap(record.viewMap);
    setActionExtraction(record.actionExtraction);
    setCriticalExamination(record.viewValidation);
    setIdeaSourceTracing(record.ideaSourceTracing);
    setBookRecommendation(record.bookRecommendation);
    setPosterContent(record.posterContent ?? null);
    setIsLiteMode(record.mode === "lite");
    setIsLiteUnlocked(record.mode === "full");
    setDecisionError("");
    setDecisionScenarios(loadDecisionScenarioCache(buildDecisionBookId(record.title)));
    setIsDecisionPanelOpen(false);
    setMessage("分析完成");
  };

  const deleteHistoryRecord = (id: string) => {
    const next = loadHistory().filter((r) => r.id !== id);
    saveHistory(next);
    setRecentHistory(next);
  };

  const toggleCard = (key: string) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navigateImmersive = (dir: "prev" | "next") => {
    const len = immersiveCardsLenRef.current;
    if (len === 0) return;
    setSlideDir(dir === "next" ? "left" : "right");
    setImmersiveIndex((prev) =>
      dir === "next" ? (prev + 1) % len : (prev - 1 + len) % len
    );
  };

  useEffect(() => {
    if (viewMode !== "immersive") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigateImmersive("prev");
      if (e.key === "ArrowRight") navigateImmersive("next");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewMode]);

  const resetAllState = () => {
    setBookTitle("");
    setBookSummary("");
    setIsLoadingBookSummary(false);
    setReadingGuide("");
    setIsLoadingReadingGuide(false);
    setViewMap("");
    setIsLoadingViewMap(false);
    setActionExtraction("");
    setIsLoadingActionExtraction(false);
    setCriticalExamination("");
    setIsLoadingViewValidation(false);
    setIdeaSourceTracing("");
    setIsLoadingIdeaSourceTracing(false);
    setChapters([]);
    setIsLiteMode(false);
    setIsLiteUnlocked(false);
    setIsPaywallModalOpen(false);
    setExpandedCards({});
    setViewMode("immersive");
    setImmersiveIndex(0);
    setSlideDir(null);
    setShareModal(null);
    setBookRecommendation("");
    setIsBookShareModalOpen(false);
    setIsPosterModalOpen(false);
    setPosterContent(null);
    setIsExportModalOpen(false);
    setExportStatus("idle");
    setDecisionScenarios([]);
    setIsDecisionPanelOpen(false);
    setIsDecisionLoading(false);
    setDecisionError("");
    setSeenCardKeys([]);
  };

  const processFile = (file: File | undefined | null) => {
    if (!file) {
      setSelectedFile(null);
      setMessage("");
      resetAllState();
      return;
    }
    const isValidType =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".epub");
    if (!isValidType) {
      setSelectedFile(null);
      setMessage("仅支持上传 PDF 或 EPUB 文件。");
      resetAllState();
      return;
    }
    setSelectedFile(file);
    setMessage("");
    resetAllState();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const fetchIdeaSourceTracing = async (
    title: string,
    bookSummary: string,
    viewMap: string
  ) => {
    try {
      setIsLoadingIdeaSourceTracing(true);
      setMessage("正在生成思想溯源...");
      const res = await fetch("/api/skills/idea-source-tracing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, viewMap }),
      });
      const data = await res.json();
      if (data.success) {
        setIdeaSourceTracing(data.ideaSourceTracing || "");
        setMessage("分析完成");
      }
    } catch (error) {
      console.error("思想溯源生成失败:", error);
    } finally {
      setIsLoadingIdeaSourceTracing(false);
    }
  };

  const fetchViewValidation = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[],
    viewMapResult: string
  ) => {
    try {
      setIsLoadingViewValidation(true);
      setMessage("正在生成观点校验...");
      const res = await fetch("/api/skills/view-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        setCriticalExamination(data.viewValidation || "");
      }
    } catch (error) {
      console.error("观点校验生成失败:", error);
    } finally {
      setIsLoadingViewValidation(false);
      fetchIdeaSourceTracing(title, bookSummary, viewMapResult);
    }
  };

  const fetchActionExtraction = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[],
    viewMapResult: string
  ) => {
    try {
      setIsLoadingActionExtraction(true);
      setMessage("正在生成行动提炼...");
      const res = await fetch("/api/skills/action-extraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        setActionExtraction(data.actionExtraction || "");
      }
    } catch (error) {
      console.error("行动提炼生成失败:", error);
    } finally {
      setIsLoadingActionExtraction(false);
      fetchViewValidation(title, bookSummary, chapters, viewMapResult);
    }
  };

  const fetchViewMap = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[]
  ) => {
    let viewMapResult = "";
    try {
      setIsLoadingViewMap(true);
      setMessage("正在生成观点地图...");
      const res = await fetch("/api/skills/view-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        viewMapResult = data.viewMap || "";
        setViewMap(viewMapResult);
      }
    } catch (error) {
      console.error("观点地图生成失败:", error);
    } finally {
      setIsLoadingViewMap(false);
      fetchActionExtraction(title, bookSummary, chapters, viewMapResult);
    }
  };

  const fetchReadingGuide = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[],
    continueChain = true
  ) => {
    try {
      setIsLoadingReadingGuide(true);
      setMessage("正在生成阅读指南...");
      const res = await fetch("/api/skills/reading-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });
      const data = await res.json();
      if (data.success) {
        setReadingGuide(data.readingGuide || "");
      }
    } catch (error) {
      console.error("阅读指南生成失败:", error);
    } finally {
      setIsLoadingReadingGuide(false);
      if (continueChain) {
        fetchViewMap(title, bookSummary, chapters);
      } else {
        setMessage("分析完成");
      }
    }
  };

  const handleUnlock = async () => {
    setIsPaywallModalOpen(false);
    setIsLiteUnlocked(true);
    const title = bookTitle;
    const currentChapters = chapters;
    let realSummary = "";
    try {
      setIsLoadingBookSummary(true);
      setMessage("正在生成全书摘要...");
      const res = await fetch("/api/skills/book-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, chapters: currentChapters }),
      });
      const data = await res.json();
      if (data.success) {
        realSummary = data.bookSummary || "";
        setBookSummary(realSummary);
      }
    } catch (err) {
      console.error("全书摘要生成失败:", err);
    } finally {
      setIsLoadingBookSummary(false);
    }
    fetchViewMap(title, realSummary, currentChapters);
  };

  const handleExport = async ({ format, structure, selectedSectionIds }: ExportParams) => {
    if (!bookTitle) return;

    // Build the full section map from current state
    const allSections: ExportSection[] = [
      { id: "bookSummary", label: "全书摘要" },
      { id: "readingGuide", label: "阅读指南" },
      { id: "viewMap", label: "观点地图" },
      { id: "actionExtraction", label: "行动提炼" },
      { id: "viewValidation", label: "观点校验" },
      { id: "ideaSourceTracing", label: "思想溯源" },
    ];
    const contentMap: Record<string, string> = {
      bookSummary,
      readingGuide,
      viewMap,
      actionExtraction,
      viewValidation: criticalExamination,
      ideaSourceTracing,
    };
    const sections = allSections
      .filter((s) => selectedSectionIds.includes(s.id) && contentMap[s.id]?.trim())
      .map((s) => ({ id: s.id, title: s.label, content: contentMap[s.id] }));

    try {
      setExportStatus("exporting");
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle,
          fileType: selectedFile?.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub",
          mode: isLiteMode && !isLiteUnlocked ? "lite" : "full",
          format,
          structure,
          sections,
        }),
      });
      if (!res.ok) {
        alert("导出失败，请稍后重试。");
        setExportStatus("idle");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = bookTitle.replace(/[/\\:*?"<>|]/g, "-").trim();
      a.download = `BookLeap-${safeTitle}-知识包.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus("success");
      if (isBeforeOnboardingStep(onboardingProgress, "exported")) {
        enqueueGuidanceToast({
          id: "onboarding-exported",
          message: "📦 已导出\n👉 试试生成分享海报，让这本书变成你的表达",
          actionText: "生成海报",
          onAction: () => {
            void handleGeneratePoster();
          },
        });
        advanceOnboardingProgress("exported");
      }
    } catch (error) {
      console.error(error);
      alert("导出失败，请稍后重试。");
      setExportStatus("idle");
    }
  };

  const handleGeneratePoster = async () => {
    if (!bookSummary) return;
    // Reuse cached content
    if (posterContent) {
      setIsPosterModalOpen(true);
      if (!isBeforeOnboardingStep(onboardingProgress, "exported")) {
        advanceOnboardingProgress("completed");
      }
      return;
    }
    setIsGeneratingPoster(true);
    try {
      const res = await fetch("/api/skills/poster-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle,
          bookSummary,
          readingGuide,
          actionExtraction,
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setPosterContent(data.content);
        setIsPosterModalOpen(true);
        if (!isBeforeOnboardingStep(onboardingProgress, "exported")) {
          advanceOnboardingProgress("completed");
        }
        // Persist poster content into history
        try {
          const fileType = selectedFile?.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub";
          const recordId = `${bookTitle}-${fileType}`;
          const history = loadHistory();
          const idx = history.findIndex((r) => r.id === recordId);
          if (idx >= 0) {
            history[idx].posterContent = data.content;
            saveHistory(history);
            setRecentHistory(history);
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("海报内容生成失败:", err);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const getDecisionCardsInput = useCallback((): DecisionCardsInput => ({
    summary: bookSummary,
    readingGuide,
    viewMap,
    actionPrinciples: actionExtraction,
    models: criticalExamination,
    insights: ideaSourceTracing,
  }), [bookSummary, readingGuide, viewMap, actionExtraction, criticalExamination, ideaSourceTracing]);

  const handleOpenDecisionTraining = useCallback(async () => {
    if (!bookTitle) return;

    const cards = getDecisionCardsInput();
    if (!hasCompleteDecisionCards(cards)) {
      setDecisionError("请先完成 6 张分析卡片，再开始决策训练。");
      return;
    }

    const bookId = buildDecisionBookId(bookTitle);
    const cached = loadDecisionScenarioCache(bookId);
    if (cached.length > 0) {
      setDecisionScenarios(cached);
      setDecisionError("");
      setIsDecisionPanelOpen(true);
      return;
    }

    try {
      setIsDecisionLoading(true);
      setDecisionError("");
      const res = await fetch("/api/decision/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle,
          cards,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setDecisionError(data.error || "决策训练生成失败，请稍后重试。");
        return;
      }

      const scenarios = normalizeDecisionScenarioList(data.scenarios, bookId);
      if (scenarios.length === 0) {
        setDecisionError("这次没有生成有效的决策训练题，请稍后再试。");
        return;
      }

      saveDecisionScenarioCache(bookId, scenarios);
      setDecisionScenarios(scenarios);
      setIsDecisionPanelOpen(true);
    } catch (error) {
      console.error("决策训练生成失败:", error);
      setDecisionError("决策训练生成失败，请稍后重试。");
    } finally {
      setIsDecisionLoading(false);
    }
  }, [bookTitle, getDecisionCardsInput]);

  useEffect(() => {
    if (message !== "分析完成" || isAnalyzing || !bookTitle || !selectedFile) return;
    if (!isBeforeOnboardingStep(onboardingProgress, "analyzed")) return;

    enqueueGuidanceToast({
      id: "onboarding-analyzed",
      message: "🎯 已生成你的6张卡片\n👉 用1分钟试试真实场景决策",
      actionText: "开始训练",
      onAction: () => {
        void handleOpenDecisionTraining();
      },
    });
    advanceOnboardingProgress("analyzed");
  }, [
    message,
    isAnalyzing,
    bookTitle,
    selectedFile,
    onboardingProgress,
    advanceOnboardingProgress,
    enqueueGuidanceToast,
    handleOpenDecisionTraining,
  ]);

  const handleAnalyze = async () => {
    
    if (!selectedFile) {
      setMessage("请先选择一本 PDF 或 EPUB 电子书。");
      return;
    }
    try {
      resetAllState();   // ✅ 放第一行

      setIsLoading(true);
      setMessage("正在上传文件...");

      // ✅ 加这 6 行（关键！）
      setIsLoadingBookSummary(true);
      setIsLoadingReadingGuide(true);
      setIsLoadingViewMap(true);
      setIsLoadingActionExtraction(true);
      setIsLoadingViewValidation(true);
      setIsLoadingIdeaSourceTracing(true);
      let res: Response;
      try {
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(selectedFile.name, selectedFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        setMessage("上传成功，正在解析章节...");
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: blob.url,
            filename: selectedFile.name,
          }),
        });
      } catch {
        setMessage("正在上传并解析章节...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
      }
      const data = await res.json();
      if (!data.success) {
        setMessage(data.error || "上传失败");
        return;
      }
      const title = data.title || "";
      const bookSummary = data.bookSummary || "";
      const chapters = data.chapters || [];
      const liteMode = data.mode === "lite";
      setMessage("文件解析成功，正在生成全书摘要...");
      setBookTitle(title);
      setBookSummary(bookSummary);
      setChapters(chapters);
      setIsLiteMode(liteMode);
      setIsLoadingBookSummary(false);
      setMessage("正在生成阅读指南...");
      fetchReadingGuide(title, bookSummary, chapters, !liteMode);
    } catch (error) {
      console.error(error);
      setMessage("请求失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render card ─────────────────────────────────────────────────────────────
  const renderCard = (
    key: string,
    label: string,
    content: string,
    isLoadingCard: boolean,
    loadingText: string,
    sectionHasExpanded = false
  ) => {
    if (!isLoadingCard && !content) return null;
    const isExpanded = expandedCards[key] ?? false;

    const cardClassName = (() => {
      const base =
        "shrink-0 w-[82vw] md:w-72 rounded-2xl bg-white border p-5 flex flex-col gap-3 snap-center transition-all duration-200";
      if (isLoadingCard)
        return `${base} border-gray-100 shadow-card cursor-default`;
      if (isExpanded)
        return `${base} border-gray-200 shadow-card-hover scale-[1.012] cursor-pointer`;
      if (sectionHasExpanded)
        return `${base} border-gray-100 shadow-card opacity-40 cursor-pointer`;
      return `${base} border-gray-100 shadow-card cursor-pointer hover:shadow-card-hover hover:border-gray-200 active:scale-[0.99]`;
    })();

    return (
      <div
        key={key}
        onClick={() => {
          if (!isLoadingCard) toggleCard(key);
        }}
        className={cardClassName}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 select-none">
            {label}
          </p>
        </div>

        {isLoadingCard ? (
          <div className="space-y-2.5 pt-1">
            <div className="h-2 bg-gray-100 rounded-full animate-pulse w-3/4" />
            <div className="h-2 bg-gray-100 rounded-full animate-pulse w-full" />
            <div className="h-2 bg-gray-100 rounded-full animate-pulse w-5/6" />
            <div className="h-2 bg-gray-100 rounded-full animate-pulse w-2/3" />
            <p className="text-[10px] text-gray-400 pt-0.5">{loadingText}</p>
          </div>
        ) : (
          <>
            <div
              className={`relative overflow-hidden ${isExpanded ? "" : "max-h-24"}`}
            >
              <div className="md-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {content}
                </ReactMarkdown>
              </div>
              {!isExpanded && (
                <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              )}
            </div>
            <p className="text-[10px] text-gray-400 text-right select-none">
              {isExpanded ? "收起 ↑" : "展开阅读 ↓"}
            </p>
          </>
        )}
      </div>
    );
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const beforeReadingExpanded = ["bookSummary", "readingGuide", "viewMap"].some(
    (k) => expandedCards[k]
  );
  const afterReadingExpanded = [
    "actionExtraction",
    "criticalExamination",
    "ideaSourceTracing",
  ].some((k) => expandedCards[k]);

  const beforeReadingCards = [
    renderCard("bookSummary", "全书摘要", bookSummary, isLoadingBookSummary, "正在生成全书摘要...", beforeReadingExpanded),
    renderCard("readingGuide", "阅读指南", readingGuide, isLoadingReadingGuide, "正在生成阅读指南...", beforeReadingExpanded),
    renderCard("viewMap", "观点地图", viewMap, isLoadingViewMap, "正在生成观点地图...", beforeReadingExpanded),
  ].filter(Boolean);

  const afterReadingCards = [
    renderCard("actionExtraction", "行动提炼", actionExtraction, isLoadingActionExtraction, "正在生成行动提炼...", afterReadingExpanded),
    renderCard("criticalExamination", "观点校验", criticalExamination, isLoadingViewValidation, "正在生成观点校验...", afterReadingExpanded),
    renderCard("ideaSourceTracing", "思想溯源", ideaSourceTracing, isLoadingIdeaSourceTracing, "正在生成思想溯源...", afterReadingExpanded),
  ].filter(Boolean);

  const allImmersiveCardDefs: ImmersiveCardDef[] = [
    { key: "bookSummary",         label: "全书摘要", content: bookSummary,         isLoading: isLoadingBookSummary,        loadingText: "正在生成全书摘要..." },
    { key: "readingGuide",        label: "阅读指南", content: readingGuide,        isLoading: isLoadingReadingGuide,       loadingText: "正在生成阅读指南..." },
    { key: "viewMap",             label: "观点地图", content: viewMap,             isLoading: isLoadingViewMap,            loadingText: "正在生成观点地图..." },
    { key: "actionExtraction",    label: "行动提炼", content: actionExtraction,    isLoading: isLoadingActionExtraction,   loadingText: "正在生成行动提炼..." },
    { key: "criticalExamination", label: "观点校验", content: criticalExamination, isLoading: isLoadingViewValidation,     loadingText: "正在生成观点校验..." },
    { key: "ideaSourceTracing",   label: "思想溯源", content: ideaSourceTracing,   isLoading: isLoadingIdeaSourceTracing,  loadingText: "正在生成思想溯源..." },
  ];

  const immersiveCardList = allImmersiveCardDefs.filter((card) => {
    if (!isLiteMode || isLiteUnlocked) return card.isLoading || !!card.content;
    return (
      ["bookSummary", "readingGuide"].includes(card.key) &&
      (card.isLoading || !!card.content)
    );
  });

  immersiveCardsLenRef.current = immersiveCardList.length;

  const safeImmersiveIndex =
    immersiveCardList.length > 0
      ? Math.min(immersiveIndex, immersiveCardList.length - 1)
      : 0;

  const currentImmersiveCard = immersiveCardList[safeImmersiveIndex];

  useEffect(() => {
    if (!currentImmersiveCard || currentImmersiveCard.isLoading || !bookTitle) return;

    setSeenCardKeys((prev) =>
      prev.includes(currentImmersiveCard.key)
        ? prev
        : [...prev, currentImmersiveCard.key]
    );
  }, [currentImmersiveCard, bookTitle]);

  useEffect(() => {
    const expandedKeys = Object.entries(expandedCards)
      .filter(([, expanded]) => expanded)
      .map(([key]) => key);

    if (expandedKeys.length === 0) return;

    setSeenCardKeys((prev) => Array.from(new Set([...prev, ...expandedKeys])));
  }, [expandedCards]);

  useEffect(() => {
    if (seenCardKeys.length < 3) return;
    if (!hasCompleteDecisionCards(getDecisionCardsInput())) return;
    if (!isBeforeOnboardingStep(onboardingProgress, "viewed_cards")) return;

    enqueueGuidanceToast({
      id: "onboarding-viewed-cards",
      message: "📚 你已经理解这本书的核心\n👉 要不要试试“用出来”？",
      actionText: "开始决策训练",
      onAction: () => {
        void handleOpenDecisionTraining();
      },
    });
    advanceOnboardingProgress("viewed_cards");
  }, [
    seenCardKeys,
    onboardingProgress,
    getDecisionCardsInput,
    handleOpenDecisionTraining,
    advanceOnboardingProgress,
    enqueueGuidanceToast,
  ]);

  const handleImmersiveTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleImmersiveTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(delta) > 50) {
      navigateImmersive(delta < 0 ? "next" : "prev");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <main className="min-h-screen bg-[#f7f7f8] px-5 py-12 md:px-8">
        <div className="mx-auto max-w-4xl">

          {/* ── Header ── */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center gap-1.5 mb-5 px-3 py-1 rounded-full bg-white border border-gray-200 text-[11px] text-gray-500 font-medium tracking-wide shadow-sm">
              <span className="text-gray-400">✦</span> AI 驱动的结构化书籍分析平台
            </div>
            <h1 className="text-[2.25rem] font-bold tracking-tight text-gray-950 mb-3 leading-tight">
              书跃 · BookLeap
            </h1>
            <p className="text-[1rem] text-gray-500 mb-2 tracking-wide">
              从好书中完成认知跃迁
            </p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
              上传电子书，获取结构化的知识卡片，提升学习的效率和质量
            </p>
          </header>

          {/* ── Upload section ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-7 mb-10">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mb-5 rounded-xl border-2 border-dashed px-6 py-9 text-center cursor-pointer transition-all duration-200 select-none ${
                isDragging
                  ? "border-gray-400 bg-gray-50 scale-[1.01]"
                  : selectedFile
                  ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
              }`}
            >
              {isDragging ? (
                <>
                  <p className="text-xl mb-2 opacity-60">📂</p>
                  <p className="text-sm font-medium text-gray-600">松开即可上传</p>
                </>
              ) : selectedFile ? (
                <>
                  <p className="text-xl mb-2 opacity-60">📄</p>
                  <p className="text-sm font-semibold text-gray-800 break-all">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    点击重新选择或拖入新文件
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl mb-2 opacity-50">📥</p>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    点击选择，或将文件拖入此处
                  </p>
                  <p className="text-xs text-gray-400">支持 EPUB / PDF</p>
                </>
              )}
            </div>

            {/* Hints */}
            <div className="mb-5 space-y-1.5">
              <p className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-px">✦</span>
                推荐使用 EPUB 文件，可获得完整六项结构化分析
              </p>
              <p className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-px">✦</span>
                较大的 PDF 可能上传失败，建议优先使用 EPUB 或压缩后的 PDF
              </p>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full bg-gray-950 text-white py-3 rounded-xl hover:bg-gray-800 transition-all duration-150 disabled:opacity-50 font-medium text-sm tracking-wide"
            >
              {isLoading ? "解析中…" : "开始分析"}
            </button>

            {/* Status banner + progress tracker */}
            {message && (() => {
              const isError =
                message.includes("失败") ||
                message.includes("仅支持") ||
                message.includes("请先选择");
              const isSuccess = message === "分析完成" && !isAnalyzing;

              const bannerClass = isError
                ? "bg-red-50/80 border-red-200/60 text-red-600"
                : isSuccess
                ? "bg-emerald-50/80 border-emerald-200/60 text-emerald-700"
                : isAnalyzing
                ? "bg-gray-50 border-gray-200 text-gray-700"
                : "bg-gray-50 border-gray-100 text-gray-500";

              /* ── 6-step progress definitions (real generation order) ── */
              const steps: { label: string; loading: boolean; done: boolean }[] = [
                { label: "全书摘要", loading: isLoadingBookSummary,        done: !!bookSummary },
                { label: "阅读指南", loading: isLoadingReadingGuide,       done: !!readingGuide },
                { label: "观点地图", loading: isLoadingViewMap,            done: !!viewMap },
                { label: "行动提炼", loading: isLoadingActionExtraction,   done: !!actionExtraction },
                { label: "观点校验", loading: isLoadingViewValidation,     done: !!criticalExamination },
                { label: "思想溯源", loading: isLoadingIdeaSourceTracing,  done: !!ideaSourceTracing },
              ];
              const showTracker =
                !isError && steps.some((s) => s.loading || s.done);
              /* In lite mode (not unlocked), only show the first 2 steps */
              const visibleSteps =
                isLiteMode && !isLiteUnlocked ? steps.slice(0, 2) : steps;

              return (
                <div
                  className={`mt-4 rounded-xl px-4 py-3 text-sm border transition-all duration-300 ${bannerClass}`}
                >
                  {/* Status text row */}
                  <span className="flex items-center gap-2.5">
                    {isAnalyzing && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-gray-400 animate-status-pulse" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-500" />
                      </span>
                    )}
                    {isSuccess && (
                      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 shrink-0">
                        <svg className="h-2.5 w-2.5 text-emerald-600" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.5 6.5L5 9l4.5-6" />
                        </svg>
                      </span>
                    )}
                    {isError && (
                      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-red-100 shrink-0">
                        <svg className="h-2.5 w-2.5 text-red-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="6" cy="6" r="4.5" />
                          <path d="M6 4v2.5" />
                          <circle cx="6" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
                        </svg>
                      </span>
                    )}
                    <span className="font-medium">{message}</span>
                  </span>

                  {/* 6-step progress tracker */}
                  {showTracker && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100/80 overflow-x-auto">
                      {visibleSteps.map((step, i) => {
                        const state: "done" | "active" | "pending" = step.done
                          ? "done"
                          : step.loading
                          ? "active"
                          : "pending";

                        const pillClass =
                          state === "done"
                            ? "bg-emerald-50 border-emerald-200/70 text-emerald-700"
                            : state === "active"
                            ? "bg-gray-900 border-gray-900 text-white"
                            : "bg-white border-gray-200 text-gray-400";

                        return (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none transition-all duration-300 select-none ${pillClass}`}
                          >
                            {state === "done" && (
                              <svg className="h-2.5 w-2.5 text-emerald-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2.5 6.5L5 9l4.5-6" />
                              </svg>
                            )}
                            {state === "active" && (
                              <span className="relative flex h-1.5 w-1.5 shrink-0">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 animate-status-pulse" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                              </span>
                            )}
                            {step.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          {/* ── Recent history ── */}
          {recentHistory.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 select-none">
                  最近分析
                </p>
              </div>
              {historyToast && (
                <div className="mb-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-2 text-xs text-amber-700 transition-all">
                  {historyToast}
                </div>
              )}
              <div className="space-y-2">
                {recentHistory.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => restoreFromHistory(record)}
                    className="group flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 shadow-card px-4 py-3 cursor-pointer hover:shadow-card-hover hover:border-gray-200 transition-all duration-200 active:scale-[0.995]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base opacity-50 shrink-0">
                        {record.fileType === "pdf" ? "📄" : "📘"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {record.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {record.fileType.toUpperCase()}
                          {record.mode === "lite" ? " · 简化版" : ""}
                          <span className="mx-1.5">·</span>
                          {new Date(record.createdAt).toLocaleDateString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryRecord(record.id);
                      }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-all text-xs p-1"
                      title="删除记录"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-300 mt-3 select-none">
                最近记录仅保存在当前浏览器，清理缓存后可能丢失。
              </p>
            </section>
          )}

          {/* ── Results ── */}
          {bookTitle && (
            <>
              {/* Title bar */}
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
                <h2 className="max-w-full text-left text-lg font-semibold leading-snug text-gray-900 md:truncate">
                  {bookTitle}
                </h2>
                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
                  {bookTitle && hasCompleteDecisionCards(getDecisionCardsInput()) && !isAnalyzing && (
                    <button
                      onClick={handleOpenDecisionTraining}
                      disabled={isDecisionLoading}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
                    >
                      {isDecisionLoading ? (
                        <>
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-300 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                          </span>
                          生成中…
                        </>
                      ) : (
                        "开始决策训练"
                      )}
                    </button>
                  )}
                  {(!isLiteMode || isLiteUnlocked) && (
                    <button
                      onClick={() => { setExportStatus("idle"); setIsExportModalOpen(true); }}
                      disabled={exportStatus === "exporting"}
                      className="flex min-w-[120px] flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 sm:flex-none"
                    >
                      {exportStatus === "exporting" ? "导出中…" : "导出知识包"}
                    </button>
                  )}
                  {bookSummary && (
                    <button
                      onClick={handleGeneratePoster}
                      disabled={isGeneratingPoster}
                      className="flex min-w-[120px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 sm:flex-none"
                    >
                      {isGeneratingPoster ? (
                        <>
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gray-500" />
                          </span>
                          生成中…
                        </>
                      ) : (
                        "生成海报"
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* View mode toggle */}
              {immersiveCardList.length > 0 && (
                <div ref={cardSectionRef} className="flex items-center mb-8">
                  <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                    <button
                      onClick={() => setViewMode("card")}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                        viewMode === "card"
                          ? "bg-gray-950 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      卡片模式
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("immersive");
                        setImmersiveIndex(0);
                        setSlideDir(null);
                      }}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                        viewMode === "immersive"
                          ? "bg-gray-950 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      沉浸阅读
                    </button>
                  </div>
                </div>
              )}

              {/* Lite mode info banner */}
              {isLiteMode && !isLiteUnlocked && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                  <span className="mt-0.5 text-amber-400 text-sm shrink-0">ℹ</span>
                  <p className="text-sm leading-6 text-amber-800">
                    <strong>PDF 简化分析模式</strong>
                    ：当前仅提供基础摘要与阅读引导。如需完整结构化分析，建议优先使用 EPUB 文件，或解锁当前 PDF 的完整版分析。
                  </p>
                </div>
              )}

              {/* Paywall card */}
              {isLiteMode && !isLiteUnlocked && (
                <div className="mb-8 rounded-2xl border border-gray-100 bg-white shadow-card p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-3">
                    解锁完整版分析
                  </p>
                  <p className="text-base font-semibold text-gray-900 mb-4">
                    解锁后可获得以下深度分析内容
                  </p>
                  <ul className="space-y-2 mb-5">
                    {[
                      "观点地图",
                      "行动提炼",
                      "观点校验",
                      "思想溯源",
                      "Obsidian 知识包导出",
                    ].map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <span className="text-emerald-500 font-bold">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-2xl font-bold text-gray-900">
                      ¥9.9
                      <span className="text-sm font-normal text-gray-400 ml-1">
                        / 本
                      </span>
                    </span>
                    <button
                      onClick={() => setIsPaywallModalOpen(true)}
                      className="rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition active:scale-[0.98]"
                    >
                      立即解锁完整版
                    </button>
                  </div>
                </div>
              )}

              {decisionError && (
                <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                  <p className="text-sm leading-6 text-amber-800">{decisionError}</p>
                </div>
              )}

              {isDecisionPanelOpen && decisionScenarios.length > 0 && (
                <DecisionTrainingPanel
                  scenarios={decisionScenarios}
                  onBackToCards={() => {
                    setIsDecisionPanelOpen(false);
                    cardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  onComplete={() => {
                    if (!isBeforeOnboardingStep(onboardingProgress, "trained")) return;
                    enqueueGuidanceToast({
                      id: "onboarding-trained",
                      message: "📚 你已经理解这本书了\n👉 下一步，把它带走",
                      actionText: "导出知识包",
                      onAction: () => {
                        setExportStatus("idle");
                        setIsExportModalOpen(true);
                      },
                    });
                    advanceOnboardingProgress("trained");
                  }}
                />
              )}

              {/* ── Immersive mode ── */}
              {!isDecisionPanelOpen &&
                viewMode === "immersive" &&
                immersiveCardList.length > 0 &&
                currentImmersiveCard && (
                  <div
                    className="mx-auto max-w-xl mb-10"
                    onTouchStart={handleImmersiveTouchStart}
                    onTouchEnd={handleImmersiveTouchEnd}
                  >
                    {/* Progress pill */}
                    <div className="flex items-center justify-center mb-5">
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
                        <span className="text-[11px] font-semibold text-gray-800 tabular-nums">
                          {safeImmersiveIndex + 1}
                        </span>
                        <span className="text-[11px] text-gray-300">/</span>
                        <span className="text-[11px] text-gray-400 tabular-nums">
                          {immersiveCardList.length}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-0.5">
                          {currentImmersiveCard.label}
                        </span>
                      </div>
                    </div>

                    {/* Card */}
                    <div
                      key={safeImmersiveIndex}
                      className={`rounded-2xl bg-white border border-gray-100 shadow-card p-8 md:p-10 ${
                        slideDir === "left"
                          ? "animate-slide-from-right"
                          : slideDir === "right"
                          ? "animate-slide-from-left"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                          {currentImmersiveCard.label}
                        </p>
                      </div>

                      {currentImmersiveCard.isLoading ? (
                        <div className="space-y-3">
                          <div className="h-2 bg-gray-100 rounded-full animate-pulse w-3/4" />
                          <div className="h-2 bg-gray-100 rounded-full animate-pulse w-full" />
                          <div className="h-2 bg-gray-100 rounded-full animate-pulse w-5/6" />
                          <div className="h-2 bg-gray-100 rounded-full animate-pulse w-2/3" />
                          <p className="text-xs text-gray-400 pt-1">
                            {currentImmersiveCard.loadingText}
                          </p>
                        </div>
                      ) : (
                        <div className="md-prose">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                          >
                            {currentImmersiveCard.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Navigation row */}
                    <div className="flex items-center justify-between mt-5">
                      <button
                        onClick={() => navigateImmersive("prev")}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.97] select-none"
                      >
                        ← 上一篇
                      </button>

                      {/* Dot indicators */}
                      <div className="flex items-center gap-1.5">
                        {immersiveCardList.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSlideDir(
                                i > safeImmersiveIndex ? "left" : "right"
                              );
                              setImmersiveIndex(i);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-200 ${
                              i === safeImmersiveIndex
                                ? "w-4 bg-gray-800"
                                : "w-1.5 bg-gray-300 hover:bg-gray-400"
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => navigateImmersive("next")}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.97] select-none"
                      >
                        下一篇 →
                      </button>
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-center text-[10px] text-gray-300 mt-3 select-none hidden md:block">
                      使用键盘 ← → 方向键切换
                    </p>
                  </div>
                )}

              {/* ── Card mode ── */}
              {!isDecisionPanelOpen && viewMode === "card" && (
                <>
                  {beforeReadingCards.length > 0 && (
                    <div className="mb-10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-4">
                        阅读前
                      </p>
                      <div className="flex items-start overflow-x-auto gap-3 pb-4 -mx-5 px-5 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
                        {beforeReadingCards}
                      </div>
                    </div>
                  )}

                  {(!isLiteMode || isLiteUnlocked) &&
                    afterReadingCards.length > 0 && (
                      <div className="mb-10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-4">
                          阅读后
                        </p>
                        <div className="flex items-start overflow-x-auto gap-3 pb-4 -mx-5 px-5 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
                          {afterReadingCards}
                        </div>
                      </div>
                    )}
                </>
              )}
            </>
          )}

          {/* Footer */}
          <footer className="mt-20 mb-4 flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Richology%E5%95%86%E6%A0%87%E9%BB%91%E4%BD%93.png"
              alt="Richology"
              className="h-7 w-auto object-contain opacity-40"
            />
            <a
              href="https://richology.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-gray-800 hover:text-gray-950 transition-colors select-none"
            >
              由 安瑟A11BERICH 构建 · 了解作者 →
            </a>
          </footer>
        </div>
      </main>

      {/* ── Payment modal ── */}
      {isPaywallModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPaywallModalOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-7 flex flex-col items-center gap-5">
            <div className="w-full">
              <p className="text-lg font-semibold text-gray-900 mb-1">
                支付解锁完整版分析
              </p>
              <p className="text-sm text-gray-500">
                请使用微信扫码支付 ¥9.9
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wechat-pay-qrcode.jpg"
                alt="微信支付二维码"
                className="w-44 h-44 object-contain"
              />
            </div>
            <p className="text-xs text-gray-400 text-center">
              支付完成后，点击下方按钮继续
            </p>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={handleUnlock}
                className="w-full rounded-xl bg-gray-950 py-3 text-sm font-medium text-white hover:bg-gray-800 transition active:scale-[0.98]"
              >
                我已支付，继续解锁
              </button>
              <button
                onClick={() => setIsPaywallModalOpen(false)}
                className="w-full rounded-xl py-2.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                暂不解锁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-card share modal ── */}
      {shareModal && (
        <ShareModal data={shareModal} onClose={() => setShareModal(null)} />
      )}

      {/* ── Export format modal ── */}
      {isExportModalOpen && (() => {
        const _sectionDefs: ExportSection[] = [
          { id: "bookSummary", label: "全书摘要" },
          { id: "readingGuide", label: "阅读指南" },
          { id: "viewMap", label: "观点地图" },
          { id: "actionExtraction", label: "行动提炼" },
          { id: "viewValidation", label: "观点校验" },
          { id: "ideaSourceTracing", label: "思想溯源" },
        ];
        const _contentMap: Record<string, string> = {
          bookSummary,
          readingGuide,
          viewMap,
          actionExtraction,
          viewValidation: criticalExamination,
          ideaSourceTracing,
        };
        const availableSections = _sectionDefs.filter(
          (s) => _contentMap[s.id]?.trim().length > 0
        );
        return (
          <ExportModal
            availableSections={availableSections}
            onExport={handleExport}
            onClose={() => { setIsExportModalOpen(false); setExportStatus("idle"); }}
            exportStatus={exportStatus}
            onRestart={() => setExportStatus("idle")}
          />
        );
      })()}

      {/* ── Book-level share modal ── */}
      {isBookShareModalOpen && bookRecommendation && (
        <BookShareModal
          bookTitle={
            bookTitle ||
            selectedFile?.name.replace(/\.(epub|pdf)$/i, "") ||
            "未知书名"
          }
          recommendation={bookRecommendation}
          onClose={() => setIsBookShareModalOpen(false)}
        />
      )}

      {/* ── Poster preview modal ── */}
      {isPosterModalOpen && posterContent && (
        <PosterPreviewModal
          data={{
            bookTitle:
              bookTitle ||
              selectedFile?.name.replace(/\.(epub|pdf)$/i, "") ||
              "未知书名",
            content: posterContent,
          }}
          onClose={() => setIsPosterModalOpen(false)}
          onRegenerate={async () => {
            setIsPosterModalOpen(false);
            setPosterContent(null);
            // Small delay so modal closes before re-opening
            await new Promise((r) => setTimeout(r, 100));
            setIsGeneratingPoster(true);
            try {
              const res = await fetch("/api/skills/poster-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: bookTitle,
                  bookSummary,
                  readingGuide,
                  actionExtraction,
                }),
              });
              const d = await res.json();
              if (d.success && d.content) {
                setPosterContent(d.content);
                setIsPosterModalOpen(true);
                try {
                  const ft = selectedFile?.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub";
                  const rid = `${bookTitle}-${ft}`;
                  const hist = loadHistory();
                  const idx = hist.findIndex((r) => r.id === rid);
                  if (idx >= 0) {
                    hist[idx].posterContent = d.content;
                    saveHistory(hist);
                    setRecentHistory(hist);
                  }
                } catch { /* ignore */ }
              }
            } catch (err) {
              console.error("海报内容重新生成失败:", err);
            } finally {
              setIsGeneratingPoster(false);
            }
          }}
        />
      )}

      {activeToast && (
        <Toast
          message={activeToast.message}
          actionText={activeToast.actionText}
          onAction={activeToast.onAction}
          durationMs={activeToast.durationMs}
          onClose={() => {
            setActiveToast(null);
            setLastToastClosedAt(Date.now());
          }}
        />
      )}
    </>
  );
}
