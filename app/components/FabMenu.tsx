"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

type HistoryItem = {
  id: string;
  title: string;
  fileType: string;
  mode: "full" | "lite";
  createdAt: string;
  isStarterBook?: boolean;
};

export type FabMenuHandle = {
  open: () => void;
};

export const FabMenu = forwardRef<FabMenuHandle, {
  historyItems: HistoryItem[];
  showRedDot: boolean;
  currentBookTitle: string;
  pendingDeleteId: string | null;
  hasCurrentBook: boolean;
  trainingUnlocked: boolean;
  exportUnlocked: boolean;
  onOpen: () => void;
  onRestoreHistory: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onOpenStarterBooks: () => void;
  onOpenTraining: () => void;
  onOpenExport: () => void;
}>(function FabMenu(
  { historyItems, showRedDot, currentBookTitle, pendingDeleteId, hasCurrentBook, trainingUnlocked, exportUnlocked, onOpen, onRestoreHistory, onDeleteHistory, onOpenStarterBooks, onOpenTraining, onOpenExport },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback(() => {
    onOpen();
    setIsOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, [onOpen]);

  const closePanel = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setIsOpen(false);
      setIsHistoryExpanded(false);
      setIsShowingAll(false);
    }, 180);
  }, []);

  useImperativeHandle(ref, () => ({ open: openPanel }), [openPanel]);

  const toggle = useCallback(() => {
    if (isOpen) closePanel();
    else openPanel();
  }, [isOpen, closePanel, openPanel]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, closePanel]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closePanel]);

  const visibleHistory = isShowingAll
    ? historyItems
    : isHistoryExpanded
    ? historyItems.slice(0, 3)
    : [];

  const hasMore = isHistoryExpanded && !isShowingAll && historyItems.length > 3;

  return (
    <div ref={panelRef} className="fixed bottom-5 left-5 z-50">
      {/* FAB button */}
      <button
        onClick={toggle}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-950 text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:shadow-xl active:scale-95"
        aria-label="我的"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {showRedDot && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {/* Floating panel */}
      {isOpen && (
        <div
          className={`absolute bottom-16 left-0 w-[320px] max-w-[90vw] rounded-2xl bg-white py-3 transition-all duration-180 ease-out ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2.5"
          }`}
          style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)" }}
        >
          {/* Header */}
          <div className="px-4 pb-2">
            <p className="text-sm font-semibold text-gray-900">我的</p>
          </div>

          {/* Content */}
          <div className="max-h-[360px] overflow-y-auto">
            {/* ── Level 1: Menu items ── */}
            {!isHistoryExpanded && (
              <div className="px-2">
                {/* History entry */}
                <button
                  onClick={() => setIsHistoryExpanded(true)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex items-center gap-2.5 text-[13px] text-gray-800">
                    <span className="text-base">📚</span>
                    历史记录
                    {historyItems.length > 0 && (
                      <span className="text-xs text-gray-400">（{historyItems.length}）</span>
                    )}
                  </span>
                  <svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Starter books entry */}
                <button
                  onClick={() => {
                    onOpenStarterBooks();
                    closePanel();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex items-center gap-2.5 text-[13px] text-gray-800">
                    <span className="text-base">🎁</span>
                    新人礼物(首次体验推荐)
                  </span>
                  <svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Current book entry */}
                {hasCurrentBook && currentBookTitle && (
                  <div className="flex w-full items-center rounded-xl px-3 py-3">
                    <span className="flex items-center gap-2.5 text-[13px] text-gray-800">
                      <span className="text-base">📖</span>
                      <span className="truncate max-w-[200px]">{currentBookTitle}</span>
                    </span>
                  </div>
                )}

                {/* Training entry (weak) */}
                {hasCurrentBook && trainingUnlocked && (
                  <button
                    onClick={() => {
                      onOpenTraining();
                      closePanel();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="flex items-center gap-2.5 text-[13px] text-gray-500">
                      <span className="text-base">🧩</span>
                      试一道题
                    </span>
                  </button>
                )}

                {/* Export entry (weak) */}
                {hasCurrentBook && exportUnlocked && (
                  <button
                    onClick={() => {
                      onOpenExport();
                      closePanel();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="flex items-center gap-2.5 text-[13px] text-gray-500">
                      <span className="text-base">📦</span>
                      导出
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* ── Level 2: History list ── */}
            {isHistoryExpanded && (
              <div className="px-2">
                {/* Back */}
                <button
                  onClick={() => {
                    setIsHistoryExpanded(false);
                    setIsShowingAll(false);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-600 mb-1"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  返回
                </button>

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 select-none mb-1.5 px-2">
                  {isShowingAll ? "全部记录" : "最近记录"}
                </p>

                {historyItems.length === 0 ? (
                  <div className="px-3 py-5 text-center text-xs text-gray-400">暂无分析记录</div>
                ) : (
                  <div className="space-y-0.5">
                    {visibleHistory.map((record) => {
                      const isCurrent = record.title === currentBookTitle;
                      const isPending = pendingDeleteId === record.id;
                      return (
                        <div
                          key={record.id}
                          onClick={() => {
                            if (isPending) return;
                            onRestoreHistory(record.id);
                            closePanel();
                          }}
                          className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-all ${
                            isPending
                              ? "opacity-40 scale-[0.98] pointer-events-none select-none"
                              : isCurrent
                              ? "bg-gray-50 cursor-pointer"
                              : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm opacity-50 shrink-0">
                              {record.fileType === "pdf" ? "📄" : "📘"}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-medium text-gray-800 truncate">
                                  {record.title}
                                </p>
                                {isCurrent && (
                                  <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-px text-[9px] font-medium text-emerald-600 leading-none">
                                    当前
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {record.fileType.toUpperCase()}
                                {record.mode === "lite" ? " · 简化版" : ""}
                                <span className="mx-1">·</span>
                                {new Date(record.createdAt).toLocaleDateString("zh-CN", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          {!isPending && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHistory(record.id);
                              }}
                              className="shrink-0 rounded-full p-1 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400 hover:bg-red-50"
                              aria-label="删除记录"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                <path d="M5 5L15 15M15 5L5 15" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show more */}
                {hasMore && (
                  <button
                    onClick={() => setIsShowingAll(true)}
                    className="mt-2 w-full text-center text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-600 py-1.5"
                  >
                    查看更多（共 {historyItems.length} 条）→
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
