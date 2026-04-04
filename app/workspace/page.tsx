"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { BookShareModal } from "../components/BookShareModal";
import {
  ExportModal,
  type ExportParams,
  type ExportSection,
} from "../components/ExportModal";
import { PosterPreviewModal } from "../components/poster/PosterPreviewModal";
import type { PosterContent } from "../components/poster/types";
import { DecisionTrainingPanel } from "../components/DecisionTrainingPanel";
import { UpgradeReadingModal } from "../components/UpgradeReadingModal";
import { StarterModePanel } from "../components/StarterModePanel";
import { Toast } from "../components/Toast";
import { FabMenu, type FabMenuHandle } from "../components/FabMenu";
import { FloatingBooks } from "../components/landing/FloatingBooks";
import {
  buildDecisionBookId,
  getDecisionCacheKey,
  getLegacyDecisionCacheKey,
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
import {
  starterBooks,
  starterBooksById,
  type StarterBookData,
} from "@/src/data/starterBooks";
import {
  DEFAULT_ADDICTION_STATE,
  getAddictionState,
  inferDecisionPattern,
  resetDecisionRound,
  setAddictionState,
  type AddictionState,
} from "@/lib/addictionSystem";
import type { DecisionOptionKey } from "@/types/decision";
import {
  type GuidanceToast,
  TOAST_PRIORITY,
  shouldPreempt,
  insertIntoQueue,
  findEligibleIndex,
} from "@/app/lib/toastScheduler";

type Chapter = {
  id: string;
  title: string;
  text: string;
  summary?: string;
};

type BgAnalysisData = {
  title: string;
  bookSummary: string;
  chapters: Chapter[];
  readingGuide: string;
  viewMap: string;
  actionExtraction: string;
  viewValidation: string;
  ideaSourceTracing: string;
  liteMode: boolean;
  fileType: string;
  starterBookId: string | null;
};

type BgAnalysisStatus =
  | { active: false }
  | { active: true; title: string; step: string; stepsCompleted: number; totalSteps: number };

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


// ── Share card content helpers ─────────────────────────────────────────────────

// ── Recent history (localStorage) ─────────────────────────────────────────────
const HISTORY_KEY = "bookleap_recent_history";
const HISTORY_MAX = 10;
const HAS_UPLOADED_BOOK_KEY = "bookleap_has_uploaded_book";
const LAST_ANALYZED_BOOK_TITLE_KEY = "bookleap_last_analyzed_book_title";
const STARTER_MODE_SEEN_KEY = "bookleap_has_seen_starter_mode";
const STARTER_SELECTED_BOOK_KEY = "bookleap_selected_starter_book";
const STARTER_EXPERIENCED_KEY = "bookleap_experienced_starter_books";

/* ── Track which starter books have been experienced ── */
function getExperiencedStarterBooks(): string[] {
  try {
    const raw = localStorage.getItem(STARTER_EXPERIENCED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markStarterBookExperienced(bookId: string) {
  try {
    const list = getExperiencedStarterBooks();
    if (!list.includes(bookId)) {
      list.push(bookId);
      localStorage.setItem(STARTER_EXPERIENCED_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}
const STARTER_ENTRY_TOAST_SESSION_KEY = "bookleap_starter_entry_toast_seen";
const RETURNING_USER_TOAST_SESSION_KEY = "bookleap_returning_user_toast_seen";
const HISTORY_REORGANIZED_KEY = "bookleap_history_reorganized_shown";
const FAB_HISTORY_SEEN_KEY = "bookleap_fab_history_seen";
const STARTER_LOADING_STEPS = [
  { text: "正在解析全书结构…", duration: 700 },
  { text: "正在提炼核心观点…", duration: 800 },
  { text: "正在生成认知卡片…", duration: 900 },
  { text: "正在整理分析结果…", duration: 600 },
] as const;

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
  isStarterBook?: boolean;
  starterBookId?: string;
  author?: string;
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

function hasSeenStarterMode(): boolean {
  try {
    return localStorage.getItem(STARTER_MODE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markStarterModeSeen() {
  try {
    localStorage.setItem(STARTER_MODE_SEEN_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

function getSelectedStarterBookId() {
  try {
    return localStorage.getItem(STARTER_SELECTED_BOOK_KEY) ?? "";
  } catch {
    return "";
  }
}

function setSelectedStarterBookId(value: string) {
  try {
    if (!value) {
      localStorage.removeItem(STARTER_SELECTED_BOOK_KEY);
      return;
    }
    localStorage.setItem(STARTER_SELECTED_BOOK_KEY, value);
  } catch {
    // ignore storage failures
  }
}

function hasSeenStarterEntryToastThisSession(): boolean {
  try {
    return sessionStorage.getItem(STARTER_ENTRY_TOAST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markStarterEntryToastSeenThisSession() {
  try {
    sessionStorage.setItem(STARTER_ENTRY_TOAST_SESSION_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

function hasSeenReturningUserToastThisSession(): boolean {
  try {
    return sessionStorage.getItem(RETURNING_USER_TOAST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markReturningUserToastSeenThisSession() {
  try {
    sessionStorage.setItem(RETURNING_USER_TOAST_SESSION_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

function hasUploadedBook(): boolean {
  try {
    return localStorage.getItem(HAS_UPLOADED_BOOK_KEY) === "1";
  } catch {
    return false;
  }
}

function markUploadedBook(title: string) {
  try {
    localStorage.setItem(HAS_UPLOADED_BOOK_KEY, "1");
    localStorage.setItem(LAST_ANALYZED_BOOK_TITLE_KEY, title);
  } catch {
    // ignore storage failures
  }
}

function getLastAnalyzedBookTitle(): string {
  try {
    return localStorage.getItem(LAST_ANALYZED_BOOK_TITLE_KEY) ?? "";
  } catch {
    return "";
  }
}

function hasHistoryReorganizedBeenShown(): boolean {
  try {
    return localStorage.getItem(HISTORY_REORGANIZED_KEY) === "1";
  } catch {
    return false;
  }
}

function markHistoryReorganizedShown() {
  try {
    localStorage.setItem(HISTORY_REORGANIZED_KEY, "1");
  } catch {
    // ignore
  }
}

function hasFabHistoryBeenSeen(): boolean {
  try {
    return localStorage.getItem(FAB_HISTORY_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markFabHistorySeen() {
  try {
    localStorage.setItem(FAB_HISTORY_SEEN_KEY, "1");
  } catch {
    // ignore
  }
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
    localStorage.removeItem(getLegacyDecisionCacheKey(bookId));
  } catch {
    // silently ignore cache failures
  }
}

function clearBookDerivedCaches(bookTitle: string) {
  try {
    const bookId = buildDecisionBookId(bookTitle);
    const keys = [
      getDecisionCacheKey(bookId),
      getLegacyDecisionCacheKey(bookId),
      `poster_content_${bookId}`,
      `poster_content_v2_${bookId}`,
    ];

    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage failures
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

/**
 * Extract the core book title from metadata that may contain
 * promotional text, recommendations, subtitles, etc.
 * e.g. "掌控习惯（樊登读书创始人樊登博士倾力推荐）美国获奖无数..." → "掌控习惯"
 */
function cleanBookTitle(raw: string): string {
  if (!raw) return raw;
  // 1. Cut at first Chinese/English parenthesis, colon, long dash, or pipe
  let title = raw.split(/[（(：:—|｜]/)[0].trim();
  // 2. If still too long (>20 chars), try cutting at common separators
  if (title.length > 20) {
    const shorter = title.split(/[,，;；\s]{2,}/)[0].trim();
    if (shorter.length >= 2) title = shorter;
  }
  // 3. Final safety: cap at 30 chars
  if (title.length > 30) {
    title = title.slice(0, 30);
  }
  return title || raw;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartXRef = useRef(0);
  const immersiveContainerRef = useRef<HTMLDivElement>(null);
  const immersiveCardsLenRef = useRef(0);
  const shouldScrollToStarterSectionRef = useRef(false);

  // ── Background analysis state ──
  const bgAnalysisRef = useRef<BgAnalysisData | null>(null);
  const bgAnalysisTitleRef = useRef<string>("");
  const [bgAnalysisStatus, setBgAnalysisStatus] = useState<BgAnalysisStatus>({ active: false });
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
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
  const [decisionLoadingStep, setDecisionLoadingStep] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [activeToast, setActiveToast] = useState<GuidanceToast | null>(null);
  const [toastQueue, setToastQueue] = useState<GuidanceToast[]>([]);
  const [lastToastClosedAt, setLastToastClosedAt] = useState(0);
  const [onboardingProgress, setOnboardingProgressState] = useState<OnboardingProgress>("none");
  const [fallbackUnlocks, setFallbackUnlocks] = useState({ training: false, export: false });
  const [seenCardKeys, setSeenCardKeys] = useState<string[]>([]);
  const [isStarterModeVisible, setIsStarterModeVisible] = useState(false);
  const [showStarterBooks, setShowStarterBooks] = useState(true);
  const [experiencedStarterIds, setExperiencedStarterIds] = useState<string[]>([]);
  const [selectedStarterBookId, setSelectedStarterBookIdState] = useState("");
  const [isStarterLoading, setIsStarterLoading] = useState(false);
  const [starterLoadingStep, setStarterLoadingStep] = useState<string>(STARTER_LOADING_STEPS[0].text);
  const [currentStarterBookId, setCurrentStarterBookId] = useState<string | null>(null);
  const [hasShownStarterEntryToast, setHasShownStarterEntryToast] = useState(false);
  const [hasShownReturningUserToast, setHasShownReturningUserToast] = useState(false);
  const [showFabRedDot, setShowFabRedDot] = useState(false);
  const fabMenuRef = useRef<FabMenuHandle>(null);
  const lastUploadPromptBookIdRef = useRef<string | null>(null);

  const [addictionState, setAddictionStateLocal] = useState<AddictionState>(DEFAULT_ADDICTION_STATE);
  const cardSectionRef = useRef<HTMLDivElement>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryRecord[]>([]);
  const [historyToast, setHistoryToast] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const isAnalyzing =
    isLoading ||
    isLoadingBookSummary ||
    isLoadingReadingGuide ||
    isLoadingViewMap ||
    isLoadingActionExtraction ||
    isLoadingViewValidation ||
    isLoadingIdeaSourceTracing;

  const currentBookId = bookTitle ? buildDecisionBookId(bookTitle) : null;
  const decisionPowerBars = `${"█".repeat(Math.min(addictionState.decision_score, 5))}${"░".repeat(
    Math.max(0, 5 - Math.min(addictionState.decision_score, 5))
  )}`;

  // Load history + onboarding progress on mount
  useEffect(() => {
    const history = loadHistory();
    const onboardingStep = getOnboardingStep();
    const starterSeen = hasSeenStarterMode();
    const starterBookId = getSelectedStarterBookId();

    const starterEntrySeenThisSession = hasSeenStarterEntryToastThisSession();
    const returningUserToastSeenThisSession = hasSeenReturningUserToastThisSession();

    setRecentHistory(history);
    setOnboardingProgressState(onboardingStep);
    setSelectedStarterBookIdState(starterBookId);
    setExperiencedStarterIds(getExperiencedStarterBooks());
    // Hide floating books if all starter books already experienced
    if (getExperiencedStarterBooks().length >= starterBooks.length) {
      setShowStarterBooks(false);
    }
    setHasShownStarterEntryToast(starterEntrySeenThisSession);
    setHasShownReturningUserToast(returningUserToastSeenThisSession);
    setShowFabRedDot(
      hasHistoryReorganizedBeenShown() && !hasFabHistoryBeenSeen() && history.length >= 3
    );
    // 不再自动进入 starter mode，新用户默认看到上传区
    setIsStarterModeVisible(false);
  }, []);

  useEffect(() => {
    if (!currentBookId) {
      setAddictionStateLocal(DEFAULT_ADDICTION_STATE);
      return;
    }

    setAddictionStateLocal(getAddictionState(currentBookId));
  }, [currentBookId]);

  // Save to history when analysis completes
  useEffect(() => {
    if (message !== "分析完成" || isAnalyzing || !bookTitle) return;
    const fileType = selectedFile?.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub";
    const currentStarterBook = currentStarterBookId
      ? starterBooksById[currentStarterBookId] ?? null
      : null;
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
      isStarterBook: !!currentStarterBook,
      starterBookId: currentStarterBook?.id,
      author: currentStarterBook?.author,
    };
    const prev = loadHistory().filter((r) => r.id !== record.id);
    const next = [record, ...prev].slice(0, HISTORY_MAX);
    saveHistory(next);
    setRecentHistory(next);
    if (!currentStarterBook) {
      markUploadedBook(record.title);
    }
    if (next.length >= 3 && !hasHistoryReorganizedBeenShown()) {
      markHistoryReorganizedShown();
      setShowFabRedDot(true);
      enqueueGuidanceToast({
        id: "history-reorganized",
        message: "📚 你的分析记录已自动整理到「我的」",
        actionText: "去看看",
        onAction: () => {
          fabMenuRef.current?.open();
        },
        priority: TOAST_PRIORITY.INFO,
        durationMs: 10000,
      });
    }
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
    // 高优先级 toast 抢占当前正在显示的低优先级 toast
    setActiveToast((current) => {
      if (shouldPreempt(current, toast)) {
        // 被挤掉的 toast 放回队列（系统级 toast 不放回）
        if (current && current.priority > TOAST_PRIORITY.SYSTEM) {
          setToastQueue((prev) => insertIntoQueue(prev, current, toast.id));
        }
        return toast;
      }
      // 不抢占，入队等待
      setToastQueue((prev) => insertIntoQueue(prev, toast, current?.id));
      return current;
    });
  }, []);

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) return;

    // 高优先级 toast（P0/P1）不受冷却期限制
    const nextPriority = toastQueue[0].priority;
    const cooldown = nextPriority <= TOAST_PRIORITY.COGNITIVE ? 0 : 10000;
    const remainingDelay = Math.max(0, cooldown - (Date.now() - lastToastClosedAt));

    const timer = window.setTimeout(() => {
      setToastQueue((prev) => {
        const idx = findEligibleIndex(prev);
        if (idx === -1) return []; // 全部不合格，清空
        setActiveToast(prev[idx]);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    }, remainingDelay);

    return () => window.clearTimeout(timer);
  }, [activeToast, toastQueue, lastToastClosedAt]);

  const hasBlockingToast = !!activeToast || toastQueue.length > 0;

  const commitDelete = useCallback((id: string) => {
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    const history = loadHistory();
    const recordToDelete = history.find((r) => r.id === id);
    const next = history.filter((r) => r.id !== id);

    if (recordToDelete) {
      clearBookDerivedCaches(recordToDelete.title);
    }

    saveHistory(next);
    setRecentHistory(next);
    setPendingDeleteId(null);
  }, []);

  const applyAddictionState = useCallback((nextState: AddictionState) => {
    setAddictionStateLocal(nextState);
    if (currentBookId) {
      setAddictionState(currentBookId, nextState);
    }
  }, [currentBookId]);

  const updateCurrentBookAddictionState = useCallback(
    (updater: (prev: AddictionState) => AddictionState) => {
      if (!currentBookId) return DEFAULT_ADDICTION_STATE;

      const nextState = updater(getAddictionState(currentBookId));
      applyAddictionState(nextState);
      return nextState;
    },
    [applyAddictionState, currentBookId]
  );

  const cancelDelete = useCallback(() => {
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    setPendingDeleteId(null);
  }, []);

  const deleteHistoryRecord = useCallback((id: string) => {
    // If there's already a pending delete, finalize it first
    if (pendingDeleteId && pendingDeleteId !== id) {
      commitDelete(pendingDeleteId);
    }

    const record = recentHistory.find((r) => r.id === id);
    const title = record?.title ?? "未知";

    setPendingDeleteId(id);

    // Clear any existing timer
    if (pendingDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
    }

    // Auto-delete after 10 seconds
    pendingDeleteTimerRef.current = window.setTimeout(() => {
      commitDelete(id);
    }, 10000);

    // Show undo toast via unified queue (P0 = SYSTEM, will preempt any lower toast)
    enqueueGuidanceToast({
      id: `delete-undo-${id}`,
      message: `已删除《${title}》\n10 秒后永久删除`,
      priority: TOAST_PRIORITY.SYSTEM,
      durationMs: 10000,
      showCloseButton: false,
      dismissible: false,
      actionText: "撤销",
      onAction: () => {
        cancelDelete();
        setActiveToast(null);
        setLastToastClosedAt(Date.now());
        setDeleteUndoActions(null);
      },
      secondaryActionText: "立即删除",
      onSecondaryAction: () => {
        commitDelete(id);
        setActiveToast(null);
        setLastToastClosedAt(Date.now());
        setDeleteUndoActions(null);
      },
    });
    setDeleteUndoActions({ id, title });
  }, [pendingDeleteId, recentHistory, commitDelete, cancelDelete, enqueueGuidanceToast]);

  const [deleteUndoActions, setDeleteUndoActions] = useState<{ id: string; title: string } | null>(null);

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
    // 切换卡片后滚动到卡片位置，而不是页面顶部
    immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const resetAllState = useCallback(() => {
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
    setCurrentStarterBookId(null);
    setAddictionStateLocal(DEFAULT_ADDICTION_STATE);
  }, []);

  /** Apply completed background analysis results to display state */
  const applyBgAnalysisToDisplay = useCallback((bg: BgAnalysisData) => {
    setBookTitle(bg.title);
    setBookSummary(bg.bookSummary);
    setChapters(bg.chapters);
    setReadingGuide(bg.readingGuide);
    setViewMap(bg.viewMap);
    setActionExtraction(bg.actionExtraction);
    setCriticalExamination(bg.viewValidation);
    setIdeaSourceTracing(bg.ideaSourceTracing);
    setIsLiteMode(bg.liteMode);
    setIsLiteUnlocked(!bg.liteMode);
    setCurrentStarterBookId(bg.starterBookId);
    setDecisionScenarios(loadDecisionScenarioCache(buildDecisionBookId(bg.title)));
    setIsDecisionPanelOpen(false);
    setDecisionError("");
    setMessage("分析完成");
  }, []);

  const restoreFromHistory = useCallback((record: HistoryRecord) => {
    // Signal background analysis to stop writing to display
    bgAnalysisTitleRef.current = "";
    // Clear loading states so history book shows cleanly
    setIsLoadingBookSummary(false);
    setIsLoadingReadingGuide(false);
    setIsLoadingViewMap(false);
    setIsLoadingActionExtraction(false);
    setIsLoadingViewValidation(false);
    setIsLoadingIdeaSourceTracing(false);
    setIsLoading(false);

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
    setCurrentStarterBookId(record.isStarterBook ? record.starterBookId ?? null : null);
    setIsLiteMode(record.mode === "lite");
    setIsLiteUnlocked(record.mode === "full");
    setDecisionError("");
    setDecisionScenarios(loadDecisionScenarioCache(buildDecisionBookId(record.title)));
    setIsDecisionPanelOpen(false);
    setMessage("");
  }, []);

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
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    // Check if this is a starter book drag
    const starterBookId = e.dataTransfer.getData("starter-book-id");
    if (starterBookId) {
      void handleSelectStarterBook(starterBookId);
      return;
    }

    processFile(e.dataTransfer.files?.[0]);
  };

  const fetchIdeaSourceTracing = async (
    title: string,
    bookSummary: string,
    viewMap: string
  ) => {
    try {
      setIsLoadingIdeaSourceTracing(true);
      const res = await fetch("/api/skills/idea-source-tracing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, viewMap }),
      });
      const data = await res.json();
      if (data.success) {
        setIdeaSourceTracing(data.ideaSourceTracing || "");
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
  ) => {
    try {
      setIsLoadingViewValidation(true);
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
    }
  };

  const fetchActionExtraction = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[],
  ) => {
    try {
      setIsLoadingActionExtraction(true);
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
    }

    // 观点地图完成后，后三步并行执行（它们之间无数据依赖）
    setMessage("正在生成剩余分析...");
    await Promise.all([
      fetchActionExtraction(title, bookSummary, chapters),
      fetchViewValidation(title, bookSummary, chapters),
      fetchIdeaSourceTracing(title, bookSummary, viewMapResult),
    ]);
    setMessage("分析完成");
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
        enqueueGuidanceToast({ id: "export-failed", message: "导出失败，请稍后重试", priority: TOAST_PRIORITY.SYSTEM, durationMs: 4000 });
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
      // 导出成功后清除"把这本书带走"的 toast
      setActiveToast((current) => {
        if (current?.id === "onboarding-trained") return null;
        return current;
      });
      if (isBeforeOnboardingStep(onboardingProgress, "exported")) {
        enqueueGuidanceToast({
          id: "onboarding-exported",
          message: "把你的这次阅读成果分享出去",
          actionText: "分享出去",
          onAction: () => {
            void handleGeneratePoster();
          },
          priority: TOAST_PRIORITY.INFO,
          durationMs: 10000,
        });
        advanceOnboardingProgress("exported");
      }
    } catch (error) {
      console.error(error);
      enqueueGuidanceToast({ id: "export-failed", message: "导出失败，请稍后重试", priority: TOAST_PRIORITY.SYSTEM, durationMs: 4000 });
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

  const DECISION_STEP_LABELS = ["正在生成第 1 题（职场场景）…", "正在生成第 2 题（个人成长）…", "正在生成第 3 题（高级决策）…"];

  const handleOpenDecisionTraining = useCallback(async () => {
    if (!bookTitle) return;

    const cards = getDecisionCardsInput();
    if (!hasCompleteDecisionCards(cards)) {
      setDecisionError("请先完成 6 张分析卡片，再开始决策训练。");
      return;
    }

    const bookId = buildDecisionBookId(bookTitle);
    applyAddictionState(resetDecisionRound(bookId));

    const cached = loadDecisionScenarioCache(bookId);
    if (cached.length === 3) {
      setDecisionScenarios(cached);
      setDecisionError("");
      setIsDecisionPanelOpen(true);
      return;
    }

    try {
      setIsDecisionLoading(true);
      setDecisionError("");
      const scenarios: import("@/types/decision").DecisionScenario[] = [];

      // 逐题生成，每完成一题立即更新进度
      for (let i = 0; i < 3; i++) {
        setDecisionLoadingStep(DECISION_STEP_LABELS[i]);
        const res = await fetch("/api/decision/generate-one", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookTitle, cards, questionIndex: i }),
        });
        const data = await res.json();
        if (!data.success || !data.scenario) {
          setDecisionError(data.error || `第 ${i + 1} 题生成失败，请稍后重试。`);
          return;
        }
        scenarios.push(data.scenario);
      }

      if (scenarios.length !== 3) {
        setDecisionError("决策训练题生成不完整，请稍后再试。");
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
      setDecisionLoadingStep("");
    }
  }, [applyAddictionState, bookTitle, getDecisionCardsInput]);

  const applyStarterBook = useCallback((starterBook: StarterBookData) => {
    resetAllState();
    setSelectedFile(null);
    setCurrentStarterBookId(starterBook.id);
    setBookTitle(starterBook.title);
    setBookSummary(starterBook.analysis.summary);
    setReadingGuide(starterBook.analysis.readingGuide);
    setViewMap(starterBook.analysis.viewMap);
    setActionExtraction(starterBook.analysis.actionExtraction);
    setCriticalExamination(starterBook.analysis.viewValidation);
    setIdeaSourceTracing(starterBook.analysis.ideaSourceTracing);
    setPosterContent(starterBook.posterContent);
    setDecisionScenarios(starterBook.decisionTraining);
    saveDecisionScenarioCache(buildDecisionBookId(starterBook.title), starterBook.decisionTraining);
    setViewMode("immersive");
    setImmersiveIndex(0);
    setMessage("分析完成");

    // Explicitly save starter book to history (don't rely on useEffect timing)
    const record: HistoryRecord = {
      id: `${starterBook.title}-epub`,
      title: starterBook.title,
      fileType: "epub",
      mode: "full",
      createdAt: new Date().toISOString(),
      bookSummary: starterBook.analysis.summary,
      readingGuide: starterBook.analysis.readingGuide,
      viewMap: starterBook.analysis.viewMap,
      actionExtraction: starterBook.analysis.actionExtraction,
      viewValidation: starterBook.analysis.viewValidation,
      ideaSourceTracing: starterBook.analysis.ideaSourceTracing,
      bookRecommendation: "",
      starterBookId: starterBook.id,
      author: starterBook.author,
    };
    const prev = loadHistory().filter((r) => r.id !== record.id);
    const next = [record, ...prev].slice(0, HISTORY_MAX);
    saveHistory(next);
    setRecentHistory(next);
  }, [resetAllState]);

  const handleDismissStarterMode = () => {
    markStarterModeSeen();
    setIsStarterModeVisible(false);
    setIsStarterLoading(false);
    setStarterLoadingStep(STARTER_LOADING_STEPS[0].text);
    setSelectedStarterBookIdState("");
    setSelectedStarterBookId("");
  };

  const scrollToStarterBooksSection = useCallback(() => {
    const el = document.getElementById("starter-books-section");
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const handleShowStarterMode = useCallback(() => {
    markStarterEntryToastSeenThisSession();
    setHasShownStarterEntryToast(true);
    setIsStarterModeVisible(true);
    setIsStarterLoading(false);
    setStarterLoadingStep(STARTER_LOADING_STEPS[0].text);
  }, []);

  const handleShowStarterModeFromToast = useCallback(() => {
    setShowStarterBooks(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isStarterModeVisible || !shouldScrollToStarterSectionRef.current) return;

    const timer = window.setTimeout(() => {
      scrollToStarterBooksSection();
      shouldScrollToStarterSectionRef.current = false;
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isStarterModeVisible, scrollToStarterBooksSection]);

  // starter-mode-entry toast 已移除：3 本预置书现在直接展示在上传区下方

  useEffect(() => {
    if (isStarterModeVisible || hasShownReturningUserToast || hasBlockingToast) return;
    if (!hasUploadedBook()) return;

    const lastTitle = getLastAnalyzedBookTitle();
    if (!lastTitle) return;

    const lastRecord = recentHistory.find((record) => record.title === lastTitle && !record.isStarterBook)
      ?? recentHistory.find((record) => !record.isStarterBook);
    if (!lastRecord) return;

    const timer = window.setTimeout(() => {
      enqueueGuidanceToast({
        id: "returning-user-reminder",
        message: `你上次分析了《${lastRecord.title}》\n继续看看？`,
        actionText: "继续查看",
        onAction: () => {
          restoreFromHistory(lastRecord);
          setTimeout(() => {
            cardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
        },
        priority: TOAST_PRIORITY.ENTRY,
        durationMs: 10000,
        eligibilityCheck: () =>
          !hasSeenStarterMode() || !!getSelectedStarterBookId(),
      });
      markReturningUserToastSeenThisSession();
      setHasShownReturningUserToast(true);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [
    enqueueGuidanceToast,
    hasBlockingToast,
    hasShownReturningUserToast,
    isStarterModeVisible,
    recentHistory,
    restoreFromHistory,
  ]);

  const handleSelectStarterBook = async (starterBookId: string) => {
    const starterBook = starterBooksById[starterBookId];
    if (!starterBook || isStarterLoading) return;

    markStarterModeSeen();
    setSelectedStarterBookIdState(starterBookId);
    setSelectedStarterBookId(starterBookId);
    setIsStarterLoading(true);
    setStarterLoadingStep(STARTER_LOADING_STEPS[0].text);

    try {
      for (const step of STARTER_LOADING_STEPS) {
        setStarterLoadingStep(step.text);
        await new Promise((resolve) => setTimeout(resolve, step.duration));
      }

      applyStarterBook(starterBook);
      setIsStarterModeVisible(false);

      // Mark this specific book as experienced
      markStarterBookExperienced(starterBookId);
      setExperiencedStarterIds((prev) => {
        const next = prev.includes(starterBookId) ? prev : [...prev, starterBookId];
        // Hide FloatingBooks only when all 3 are experienced
        if (next.length >= starterBooks.length) {
          setShowStarterBooks(false);
        }
        return next;
      });

      // 解析完成后自动滚动到卡片区域
      setTimeout(() => {
        cardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);

      // 滚动到位后弹出引导 toast
      setTimeout(() => {
        enqueueGuidanceToast({
          id: `starter-book-ready-${starterBookId}`,
          message: "你可以开始阅读这本书的核心内容了\n👉 左右滑动卡片",
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 5000,
        });
      }, 600);
    } finally {
      setIsStarterLoading(false);
    }
  };

  useEffect(() => {
    if (message !== "分析完成" || isAnalyzing || !bookTitle || !selectedFile || !currentBookId) return;
    if (lastUploadPromptBookIdRef.current === currentBookId) return;

    enqueueGuidanceToast({
      id: `addiction-upload-${currentBookId}`,
      message: "你可以开始阅读这本书的核心内容了\n👉 左右滑动卡片",
      priority: TOAST_PRIORITY.COGNITIVE,
      durationMs: 5000,
    });
    lastUploadPromptBookIdRef.current = currentBookId;

    if (isBeforeOnboardingStep(onboardingProgress, "analyzed")) {
      advanceOnboardingProgress("analyzed");
    }
  }, [
    message,
    isAnalyzing,
    bookTitle,
    selectedFile,
    currentBookId,
    onboardingProgress,
    advanceOnboardingProgress,
    enqueueGuidanceToast,
  ]);

  const handleAnalyze = async () => {
    
    if (!selectedFile) {
      setMessage("请先选择一本 PDF 或 EPUB 电子书。");
      return;
    }
    try {
      resetAllState();

      setIsLoading(true);
      setMessage("正在上传文件...");

      setIsLoadingBookSummary(true);
      setIsLoadingReadingGuide(true);
      setIsLoadingViewMap(true);
      setIsLoadingActionExtraction(true);
      setIsLoadingViewValidation(true);
      setIsLoadingIdeaSourceTracing(true);

      // Initialize background analysis tracker
      const bg: BgAnalysisData = {
        title: "", bookSummary: "", chapters: [], readingGuide: "",
        viewMap: "", actionExtraction: "", viewValidation: "",
        ideaSourceTracing: "", liteMode: false,
        fileType: selectedFile.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub",
        starterBookId: currentStarterBookId,
      };
      bgAnalysisRef.current = null;
      let stepsCompleted = 0;
      const totalSteps = 6;
      const updateProgress = (step: string) => {
        setBgAnalysisStatus({ active: true, title: bg.title || "新书", step, stepsCompleted, totalSteps });
      };
      updateProgress("上传解析中…");

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
        setBgAnalysisStatus({ active: false });
        return;
      }
      const title = cleanBookTitle(data.title || "");
      const bkSummary = data.bookSummary || "";
      const chaps: Chapter[] = data.chapters || [];
      const liteMode = data.mode === "lite";

      bg.title = title;
      bg.bookSummary = bkSummary;
      bg.chapters = chaps;
      bg.liteMode = liteMode;
      stepsCompleted = 1;
      bgAnalysisTitleRef.current = title;

      // Helper: only write to display if user is still viewing this book
      const isStillViewing = () => bgAnalysisTitleRef.current === title;

      // Show initial results immediately
      setBookTitle(title);
      setBookSummary(bkSummary);
      setChapters(chaps);
      setIsLiteMode(liteMode);
      setIsLoadingBookSummary(false);

      if (liteMode) {
        setIsLoadingViewMap(false);
        setIsLoadingActionExtraction(false);
        setIsLoadingViewValidation(false);
        setIsLoadingIdeaSourceTracing(false);
        
        setMessage("正在生成阅读指南...");
        updateProgress("阅读指南…");
        fetchReadingGuide(title, bkSummary, chaps, false);
        setBgAnalysisStatus({ active: false });
        // NOTE: We rely on the useEffect hook to catch message === "分析完成" && !isAnalyzing to save history.
        return;
      }

      // ── Reading Guide ──
      updateProgress("阅读指南…");
      if (isStillViewing()) setMessage("正在生成阅读指南...");
      try {
        const guideRes = await fetch("/api/skills/reading-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        });
        const guideData = await guideRes.json();
        if (guideData.success) {
          bg.readingGuide = guideData.readingGuide || "";
          if (isStillViewing()) setReadingGuide(bg.readingGuide);
        }
      } catch (e) { console.error("阅读指南生成失败:", e); }
      if (isStillViewing()) setIsLoadingReadingGuide(false);
      stepsCompleted = 2;

      // ── View Map ──
      updateProgress("观点地图…");
      if (isStillViewing()) setMessage("正在生成观点地图...");
      try {
        const vmRes = await fetch("/api/skills/view-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        });
        const vmData = await vmRes.json();
        if (vmData.success) {
          bg.viewMap = vmData.viewMap || "";
          if (isStillViewing()) setViewMap(bg.viewMap);
        }
      } catch (e) { console.error("观点地图生成失败:", e); }
      if (isStillViewing()) setIsLoadingViewMap(false);
      stepsCompleted = 3;

      // ── Parallel: Action + Validation + IdeaSource ──
      updateProgress("剩余分析…");
      if (isStillViewing()) setMessage("正在生成剩余分析...");
      const [actionResult, validResult, ideaResult] = await Promise.allSettled([
        fetch("/api/skills/action-extraction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        }).then(r => r.json()),
        fetch("/api/skills/view-validation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, chapters: chaps }),
        }).then(r => r.json()),
        fetch("/api/skills/idea-source-tracing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, bookSummary: bkSummary, viewMap: bg.viewMap || "" }),
        }).then(r => r.json()),
      ]);

      if (actionResult.status === "fulfilled" && actionResult.value.success) {
        bg.actionExtraction = actionResult.value.actionExtraction || "";
        if (isStillViewing()) setActionExtraction(bg.actionExtraction);
      }
      if (validResult.status === "fulfilled" && validResult.value.success) {
        bg.viewValidation = validResult.value.viewValidation || "";
        if (isStillViewing()) setCriticalExamination(bg.viewValidation);
      }
      if (ideaResult.status === "fulfilled" && ideaResult.value.success) {
        bg.ideaSourceTracing = ideaResult.value.ideaSourceTracing || "";
        if (isStillViewing()) setIdeaSourceTracing(bg.ideaSourceTracing);
      }
      if (isStillViewing()) {
        setIsLoadingActionExtraction(false);
        setIsLoadingViewValidation(false);
        setIsLoadingIdeaSourceTracing(false);
      }
      stepsCompleted = totalSteps;

      // ── Save to history ──
      bgAnalysisRef.current = bg;

      if (isStillViewing()) {
        // User is still on this book — just mark complete
        setMessage("分析完成");
      } else {
        // User switched away — offer to switch back via toast
        const savedBg = { ...bg };
        enqueueGuidanceToast({
          id: `bg-analysis-done-${title}`,
          message: `《${title}》分析完成`,
          actionText: "查看",
          onAction: () => {
            applyBgAnalysisToDisplay(savedBg);
            bgAnalysisRef.current = null;
          },
          priority: TOAST_PRIORITY.COGNITIVE,
          durationMs: 10000,
        });
      }
    } catch (error) {
      console.error(error);
      setMessage("请求失败，请稍后重试。");
      setIsLoadingBookSummary(false);
      setIsLoadingReadingGuide(false);
      setIsLoadingViewMap(false);
      setIsLoadingActionExtraction(false);
      setIsLoadingViewValidation(false);
      setIsLoadingIdeaSourceTracing(false);
    } finally {
      setIsLoading(false);
      setBgAnalysisStatus({ active: false });
      bgAnalysisRef.current = null;
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
    if (!currentBookId) return;

    const nextViewedCount = Math.max(addictionState.viewed_cards_count, seenCardKeys.length);
    if (nextViewedCount === addictionState.viewed_cards_count) return;

    applyAddictionState({
      ...addictionState,
      viewed_cards_count: nextViewedCount,
    });

    if (nextViewedCount === 1) {
      enqueueGuidanceToast({
        id: `addiction-browse-${currentBookId}`,
        message: "继续浏览，你会更快抓住这本书的结构",
        priority: TOAST_PRIORITY.GUIDANCE,
        durationMs: 5000,
      });
    }
  }, [
    addictionState,
    applyAddictionState,
    currentBookId,
    enqueueGuidanceToast,
    seenCardKeys.length,
  ]);

  useEffect(() => {
    const expandedKeys = Object.entries(expandedCards)
      .filter(([, expanded]) => expanded)
      .map(([key]) => key);

    if (expandedKeys.length === 0) return;

    setSeenCardKeys((prev) => Array.from(new Set([...prev, ...expandedKeys])));
  }, [expandedCards]);

  useEffect(() => {
    if (!currentBookId) return;
    if (addictionState.viewed_cards_count < 3) return;
    if (addictionState.has_triggered_training_prompt) return;
    if (addictionState.decision_training_progress > 0) return;
    if (!hasCompleteDecisionCards(getDecisionCardsInput())) return;

    enqueueGuidanceToast({
      id: `addiction-training-prompt-${currentBookId}`,
      message: "试一道题，看看这本书会怎么影响你的选择",
      actionText: "试一道题",
      onAction: () => {
        void handleOpenDecisionTraining();
      },
      priority: TOAST_PRIORITY.GUIDANCE,
      durationMs: 10000,
    });

    applyAddictionState({
      ...addictionState,
      has_triggered_training_prompt: true,
    });

    if (isBeforeOnboardingStep(onboardingProgress, "viewed_cards")) {
      advanceOnboardingProgress("viewed_cards");
    }
  }, [
    currentBookId,
    addictionState,
    getDecisionCardsInput,
    handleOpenDecisionTraining,
    applyAddictionState,
    onboardingProgress,
    advanceOnboardingProgress,
    enqueueGuidanceToast,
  ]);

  // ── Fallback timers: prevent user from getting stuck ──────────────────────
  useEffect(() => {
    if (!currentBookId) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Scenario 1: entered card view but hasn't browsed >=3 cards after 30s
    if (onboardingProgress === "analyzed" && addictionState.viewed_cards_count < 3) {
      timers.push(setTimeout(() => {
        enqueueGuidanceToast({
          id: `fallback-skip-cards-${currentBookId}`,
          message: "你也可以直接试一道题",
          actionText: "试一道题",
          onAction: () => void handleOpenDecisionTraining(),
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 10000,
        });
        setFallbackUnlocks((prev) => ({ ...prev, training: true }));
      }, 30000));
    }

    // Scenario 2: training entry visible but not clicked after 30s
    if (
      !isBeforeOnboardingStep(onboardingProgress, "viewed_cards") &&
      isBeforeOnboardingStep(onboardingProgress, "trained") &&
      addictionState.decision_training_progress === 0 &&
      !isDecisionLoading &&
      !isDecisionPanelOpen
    ) {
      timers.push(setTimeout(() => {
        enqueueGuidanceToast({
          id: `fallback-nudge-training-${currentBookId}`,
          message: "继续看卡片也可以，或者试一道题",
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 10000,
        });
      }, 30000));
    }

    // Scenario 3: completed 3 questions but hasn't exported after 30s
    if (
      !isBeforeOnboardingStep(onboardingProgress, "trained") &&
      isBeforeOnboardingStep(onboardingProgress, "exported")
    ) {
      timers.push(setTimeout(() => {
        enqueueGuidanceToast({
          id: `fallback-nudge-export-${currentBookId}`,
          message: "你可以把这本书保存下来",
          actionText: "导出",
          onAction: () => {
            setExportStatus("idle");
            setIsExportModalOpen(true);
          },
          priority: TOAST_PRIORITY.GUIDANCE,
          durationMs: 10000,
        });
        setFallbackUnlocks((prev) => ({ ...prev, export: true }));
      }, 30000));
    }

    return () => timers.forEach(clearTimeout);
  }, [onboardingProgress, currentBookId, addictionState.viewed_cards_count, addictionState.decision_training_progress, isDecisionLoading, isDecisionPanelOpen, enqueueGuidanceToast, handleOpenDecisionTraining]);

  const handleImmersiveTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleImmersiveTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(delta) > 50) {
      navigateImmersive(delta < 0 ? "next" : "prev");
    }
  };

  // ── Onboarding unlock flags ────────────────────────────────────────────────
  const isOnboardingCompleted = onboardingProgress === "completed";
  const trainingUnlocked = isOnboardingCompleted || !isBeforeOnboardingStep(onboardingProgress, "viewed_cards") || fallbackUnlocks.training;
  const exportUnlocked = isOnboardingCompleted || !isBeforeOnboardingStep(onboardingProgress, "trained") || fallbackUnlocks.export;
  const posterUnlocked = isOnboardingCompleted || !isBeforeOnboardingStep(onboardingProgress, "exported");
  const historyVisible = isOnboardingCompleted || onboardingProgress !== "none";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Workspace header */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 md:px-8">
          <a href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Richology%E5%95%86%E6%A0%87%E9%BB%91%E4%BD%93.png"
              alt="Richology"
              className="h-5 w-auto object-contain"
            />
          </a>
          <a
            href="/"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-all hover:border-gray-300 hover:text-gray-900 active:scale-[0.97]"
          >
            返回首页
          </a>
        </div>
      </nav>
      <main className="min-h-screen bg-[#f7f7f8]">
        {/* ── Hero gradient background ── */}
        <div className={`relative overflow-hidden bg-gradient-to-br from-amber-50 via-sky-50 to-violet-50 px-5 pt-20 md:px-8 md:pt-24 ${showStarterBooks && !isStarterLoading ? "pb-52 md:pb-56" : "pb-10"}`}>
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -top-12 right-0 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-violet-200/20 blur-3xl" />

          {/* Floating book names + draggable starter books */}
          {showStarterBooks && !isStarterLoading && (
            <FloatingBooks
              starterBooks={starterBooks.map((b) => ({ id: b.id, title: b.title, coverImage: b.coverImage }))}
              experiencedIds={experiencedStarterIds}
              onStarterBookDrop={(bookId) => void handleSelectStarterBook(bookId)}
            />
          )}

        <div className="mx-auto max-w-4xl">

          {/* ── Header ── */}
          <header className="relative z-10 mb-12 text-center">
            <div className="inline-flex items-center gap-1.5 mb-5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-sm border border-white/60 text-[11px] text-gray-500 font-medium tracking-wide shadow-sm">
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
          <section className="relative z-10 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-card p-7 mb-10">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Starter book loading overlay */}
            {isStarterLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-70" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-gray-700" />
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-950">正在为你准备这本书</h3>
                <p className="mt-2 text-sm text-gray-500 transition-opacity duration-300">{starterLoadingStep}</p>
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
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
                  <p className="text-sm font-medium text-gray-600">松开即可开始分析</p>
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
                    那本你买了但一直没读完的书，传上来
                  </p>
                  <p className="text-xs text-gray-400">30 秒后你就能用起来 · 支持 EPUB / PDF</p>
                </>
              )}
            </div>

            {/* Hints */}
            <div className="mb-5 space-y-1.5">
              <p className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-px">✦</span>
                推荐 EPUB 格式，解析更完整，可获得全部六项结构化分析
              </p>
              <p className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-px">✦</span>
                PDF 也支持，但较大文件可能影响解析效果
              </p>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full bg-gray-950 text-white py-3 rounded-xl hover:bg-gray-800 transition-all duration-150 disabled:opacity-50 font-medium text-sm tracking-wide"
            >
              {isLoading ? "解析中…" : "开始分析"}
            </button>
          </section>

        </div>{/* end max-w-4xl inside hero */}
        </div>{/* end hero gradient */}

        {/* ── Content area (light gray bg) ── */}
        <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-4xl">

          {/* ── Status banner + progress tracker (independent of upload panel) ── */}
          {message && !(bgAnalysisStatus.active && bgAnalysisTitleRef.current !== bookTitle) && (() => {
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
                className={`mb-6 rounded-xl px-4 py-3 text-sm border transition-all duration-300 ${bannerClass}`}
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

          {/* ── Recent history ── */}
          {historyVisible && recentHistory.length > 0 && (
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
                {recentHistory.slice(0, 2).map((record) => {
                  const isPending = pendingDeleteId === record.id;
                  return (
                    <div
                      key={record.id}
                      onClick={() => {
                        if (!isPending) {
                          restoreFromHistory(record);
                          setTimeout(() => {
                            immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 100);
                        }
                      }}
                      className={`group flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 shadow-card px-4 py-3 transition-all duration-200 ${
                        isPending
                          ? "opacity-40 scale-[0.98] pointer-events-none select-none"
                          : "cursor-pointer hover:shadow-card-hover hover:border-gray-200 active:scale-[0.995]"
                      }`}
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
                      {!isPending && (
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
                      )}
                    </div>
                  );
                })}
              </div>
              {recentHistory.length > 2 && (
                <button
                  onClick={() => fabMenuRef.current?.open()}
                  className="mt-3 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
                >
                  查看更多 →
                </button>
              )}
              <p className="text-[10px] text-gray-300 mt-3 select-none">
                最近记录仅保存在当前浏览器，清理缓存后可能丢失。
              </p>
            </section>
          )}

          {/* ── Results ── */}
          {bookTitle && (
            <>
              {/* Title bar */}
              <div ref={immersiveContainerRef} className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4" style={{ scrollMarginTop: "70px" }}>
                <h2 className="max-w-full text-left text-lg font-semibold leading-snug text-gray-900 md:truncate">
                  {bookTitle}
                </h2>
                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
                  {trainingUnlocked && bookTitle && !isAnalyzing && (() => {
                    const cardsReady = hasCompleteDecisionCards(getDecisionCardsInput());
                    return (
                      <button
                        onClick={handleOpenDecisionTraining}
                        disabled={isDecisionLoading || !cardsReady}
                        title={cardsReady ? undefined : "完成全部分析卡片后可开始决策训练"}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                      >
                        {isDecisionLoading ? (
                          <>
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-300 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                            </span>
                            {decisionLoadingStep || "生成中…"}
                          </>
                        ) : (
                          addictionState.decision_training_progress > 0 ? "回顾题目" : "试一道题"
                        )}
                      </button>
                    );
                  })()}
                  {exportUnlocked && (!isLiteMode || isLiteUnlocked) && (
                    <button
                      onClick={() => { setExportStatus("idle"); setIsExportModalOpen(true); }}
                      disabled={exportStatus === "exporting"}
                      className="flex min-w-[120px] flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 sm:flex-none"
                    >
                      {exportStatus === "exporting" ? "导出中…" : "把这本书带走"}
                    </button>
                  )}
                  {posterUnlocked && bookSummary && (
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
                        "分享出去"
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* View mode toggle */}
              {immersiveCardList.length > 0 && (
                <div ref={cardSectionRef} className="mb-8 flex items-center justify-between gap-4" style={{ scrollMarginTop: "70px" }}>
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
                  {currentBookId && (
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        决策力
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {decisionPowerBars}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Lite mode info banner */}
              {isLiteMode && !isLiteUnlocked && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                  <span className="mt-0.5 text-amber-400 text-sm shrink-0">ℹ</span>
                  <p className="text-sm leading-6 text-amber-800">
                    <strong>PDF 简化分析模式</strong>
                    ：当前仅提供基础摘要与阅读引导。为了获得效果更佳的深度结构化分析，建议您优先选择并重新上传 EPUB 格式的文件。
                  </p>
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
                  onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                  onBackToCards={() => {
                    setIsDecisionPanelOpen(false);
                    immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  onAnswerComplete={(option: DecisionOptionKey, progress: number) => {
                    if (!currentBookId) return;

                    const nextState = updateCurrentBookAddictionState((prev) => ({
                      ...prev,
                      decision_training_progress: progress,
                      decision_history: [...prev.decision_history, option],
                      decision_score: prev.decision_score + 1,
                    }));

                    if (progress === 1) {
                      enqueueGuidanceToast({
                        id: `addiction-first-answer-${currentBookId}`,
                        message: "你刚才的选择，其实很有代表性",
                        priority: TOAST_PRIORITY.GUIDANCE,
                        durationMs: 5000,
                      });
                    }

                    if (progress === 2) {
                      enqueueGuidanceToast({
                        id: `addiction-tension-${currentBookId}`,
                        message: "再做1题，你会看到你的决策模式",
                        priority: TOAST_PRIORITY.GUIDANCE,
                        durationMs: 10000,
                        showCloseButton: true,
                        dismissible: true,
                      });
                    }

                    if (progress >= 3) {
                      const patternMessage = inferDecisionPattern(nextState.decision_history);
                      if (patternMessage) {
                        enqueueGuidanceToast({
                          id: `addiction-pattern-${currentBookId}`,
                          message: `${patternMessage}\n\n右上角的「决策力」记录你做过多少次真实场景练习，做得越多，决策力越高。`,
                          priority: TOAST_PRIORITY.COGNITIVE,
                          durationMs: 0,
                          isPersistent: true,
                          showCloseButton: true,
                          dismissible: true,
                        });
                      }
                    }
                  }}
                  onComplete={() => {
                    if (!isBeforeOnboardingStep(onboardingProgress, "trained")) return;
                    enqueueGuidanceToast({
                      id: "onboarding-trained",
                      message: "把这本书带走",
                      actionText: "导出",
                      onAction: () => {
                        setExportStatus("idle");
                        setIsExportModalOpen(true);
                      },
                      priority: TOAST_PRIORITY.INFO,
                      durationMs: 10000,
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

                    {/* Keyboard hint */}
                    <p className="text-center text-[10px] text-gray-300 mt-3 select-none hidden md:block">
                      使用键盘 ← → 方向键切换
                    </p>

                    {/* Spacer for fixed bottom nav */}
                    <div className="h-16" />

                    {/* Fixed bottom navigation */}
                    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t border-gray-100 px-4 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                      <div className="mx-auto max-w-xl flex items-center justify-between">
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
                                immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
                    </div>
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

          {/* Footer 已移到页面最底部 */}
        </div>{/* end max-w-4xl content */}
        </div>{/* end content area */}

        {/* ── Footer ── */}
        <footer className="py-8 pb-20 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Richology%E5%95%86%E6%A0%87%E9%BB%91%E4%BD%93.png"
            alt="Richology"
            width={256}
            height={28}
            className="h-7 w-auto object-contain"
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
      </main>
      
      <UpgradeReadingModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        wechatId="iwbr1988"
        qrImageSrc="/contact-avatar.png"
      />

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
          onAction={activeToast.onAction ? () => {
            activeToast.onAction?.();
            // onAction 内部已处理 setActiveToast(null) 的情况（如删除撤销）
            // 对于普通 toast，onAction 后自动关闭由 Toast 组件内部处理
          } : undefined}
          secondaryActionText={activeToast.secondaryActionText}
          onSecondaryAction={activeToast.onSecondaryAction ? () => {
            activeToast.onSecondaryAction?.();
          } : undefined}
          durationMs={activeToast.isPersistent ? 0 : (activeToast.durationMs ?? 10000)}
          showCloseButton={activeToast.showCloseButton ?? true}
          dismissible={activeToast.dismissible ?? true}
          onClose={() => {
            setActiveToast(null);
            setLastToastClosedAt(Date.now());
            // 删除撤销 toast 自动关闭时清理 undo 状态
            if (activeToast.id.startsWith("delete-undo-")) {
              setDeleteUndoActions(null);
            }
          }}
        />
      )}

      {/* ── Background analysis progress indicator ── */}
      {bgAnalysisStatus.active && bgAnalysisTitleRef.current !== bookTitle && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl bg-gray-950/90 backdrop-blur-sm px-4 py-2.5 shadow-lg text-white text-xs">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="max-w-[180px] truncate">《{bgAnalysisStatus.title}》{bgAnalysisStatus.step}</span>
          <span className="text-gray-400">{bgAnalysisStatus.stepsCompleted}/{bgAnalysisStatus.totalSteps}</span>
        </div>
      )}

      <FabMenu
        ref={fabMenuRef}
        historyItems={recentHistory}
        showRedDot={showFabRedDot}
        currentBookTitle={bookTitle}
        pendingDeleteId={pendingDeleteId}
        onOpen={() => {
          if (showFabRedDot) {
            markFabHistorySeen();
            setShowFabRedDot(false);
          }
        }}
        onRestoreHistory={(id) => {
          const record = recentHistory.find((r) => r.id === id);
          if (record) {
            restoreFromHistory(record);
            setHistoryToast(`已切换到《${record.title}》`);
            setTimeout(() => setHistoryToast(""), 2500);
            setTimeout(() => {
              immersiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }
        }}
        onDeleteHistory={deleteHistoryRecord}
        onOpenStarterBooks={handleShowStarterModeFromToast}
        hasCurrentBook={!!bookTitle}
        trainingUnlocked={trainingUnlocked}
        exportUnlocked={exportUnlocked}
        onOpenTraining={() => void handleOpenDecisionTraining()}
        onOpenExport={() => { setExportStatus("idle"); setIsExportModalOpen(true); }}
      />
    </>
  );
}
