"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

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
  const [isExporting, setIsExporting] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [isLiteUnlocked, setIsLiteUnlocked] = useState(false);
  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"card" | "immersive">("card");
  const [immersiveIndex, setImmersiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setViewMode("card");
    setImmersiveIndex(0);
    setSlideDir(null);
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

    // Capture current state values for the async chain
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

    // Step 2: kick off the full skill chain with the real summary
    fetchViewMap(title, realSummary, currentChapters);
  };

  const handleExport = async () => {
    if (!bookTitle) return;

    try {
      setIsExporting(true);

      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle,
          bookSummary,
          readingGuide,
          viewMap,
          actionExtraction,
          viewValidation: criticalExamination,
          ideaSourceTracing,
        }),
      });

      if (!res.ok) {
        alert("导出失败，请稍后重试。");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bookTitle}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("导出失败，请稍后重试。");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setMessage("请先选择一本 PDF 或 EPUB 电子书。");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("正在上传文件...");
      resetAllState();

      let res: Response;

      try {
        // Try Vercel Blob client upload (production)
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
        // Blob not available (local dev) — fall back to direct FormData
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

      setMessage("文件解析成功，正在进入分析流程...");
      setBookTitle(title);
      setBookSummary(bookSummary);
      setChapters(chapters);
      setIsLiteMode(liteMode);

      fetchReadingGuide(title, bookSummary, chapters, !liteMode);
    } catch (error) {
      console.error(error);
      setMessage("请求失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const renderCard = (
    key: string,
    label: string,
    content: string,
    isLoadingCard: boolean,
    loadingText: string,
    sectionHasExpanded: boolean = false
  ) => {
    if (!isLoadingCard && !content) return null;

    const isExpanded = expandedCards[key] ?? false;

    const cardClassName = (() => {
      const base =
        "shrink-0 w-[85vw] md:w-80 rounded-2xl bg-white border p-5 flex flex-col gap-3 snap-center transition-all duration-200";
      if (isLoadingCard) {
        return `${base} border-gray-100 shadow-sm cursor-default`;
      }
      if (isExpanded) {
        return `${base} border-gray-300 shadow-lg scale-[1.015] cursor-pointer`;
      }
      if (sectionHasExpanded) {
        return `${base} border-gray-100 shadow-sm opacity-40 cursor-pointer`;
      }
      return `${base} border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-200 active:scale-[0.99]`;
    })();

    return (
      <div
        key={key}
        onClick={() => {
          if (!isLoadingCard) toggleCard(key);
        }}
        className={cardClassName}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 select-none">
          {label}
        </p>

        {isLoadingCard ? (
          <div className="space-y-2.5">
            <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-full" />
            <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-5/6" />
            <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-2/3" />
            <p className="text-[11px] text-gray-400 pt-1">{loadingText}</p>
          </div>
        ) : (
          <>
            <div className={`relative overflow-hidden ${isExpanded ? "" : "max-h-24"}`}>
              <div className="md-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
              </div>
              {!isExpanded && (
                <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              )}
            </div>
            <p className="text-[11px] text-gray-400 text-right select-none pt-1">
              {isExpanded ? "收起 ↑" : "展开阅读 ↓"}
            </p>
          </>
        )}
      </div>
    );
  };
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

  // Immersive mode: flat ordered card list
  const allImmersiveCardDefs: ImmersiveCardDef[] = [
    { key: "bookSummary",        label: "全书摘要", content: bookSummary,        isLoading: isLoadingBookSummary,        loadingText: "正在生成全书摘要..." },
    { key: "readingGuide",       label: "阅读指南", content: readingGuide,       isLoading: isLoadingReadingGuide,       loadingText: "正在生成阅读指南..." },
    { key: "viewMap",            label: "观点地图", content: viewMap,            isLoading: isLoadingViewMap,            loadingText: "正在生成观点地图..." },
    { key: "actionExtraction",   label: "行动提炼", content: actionExtraction,   isLoading: isLoadingActionExtraction,   loadingText: "正在生成行动提炼..." },
    { key: "criticalExamination",label: "观点校验", content: criticalExamination,isLoading: isLoadingViewValidation,     loadingText: "正在生成观点校验..." },
    { key: "ideaSourceTracing",  label: "思想溯源", content: ideaSourceTracing,  isLoading: isLoadingIdeaSourceTracing,  loadingText: "正在生成思想溯源..." },
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

  const handleImmersiveTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleImmersiveTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(delta) > 50) {
      navigateImmersive(delta < 0 ? "next" : "prev");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">书跃 · BookLeap</h1>
          <p className="text-lg text-gray-500 mb-4">从好书中完成认知跃迁</p>
          <p className="text-gray-400 max-w-xl mx-auto leading-7 text-sm">
            上传电子书，将书籍转化为结构化的知识卡片，提升知识获取的效率和质量
          </p>
        </header>

        <section className="bg-white shadow-sm rounded-2xl p-8 border border-gray-100 mb-10">
          {/* Hidden native file input */}
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
            className={`mb-4 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-all duration-200 select-none ${
              isDragging
                ? "border-gray-500 bg-gray-50 scale-[1.01]"
                : selectedFile
                ? "border-gray-300 bg-gray-50 hover:border-gray-400"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {isDragging ? (
              <>
                <p className="text-2xl mb-2">📂</p>
                <p className="text-sm font-medium text-gray-600">松开即可上传</p>
              </>
            ) : selectedFile ? (
              <>
                <p className="text-2xl mb-2">📄</p>
                <p className="text-sm font-semibold text-gray-800 break-all">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-400 mt-1">点击重新选择或拖入新文件</p>
              </>
            ) : (
              <>
                <p className="text-2xl mb-2">📥</p>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  点击选择文件，或将文件拖入此区域
                </p>
                <p className="text-xs text-gray-400">支持 EPUB / PDF</p>
              </>
            )}
          </div>

          {/* Helper hints */}
          <div className="mb-5 space-y-1">
            <p className="text-xs text-gray-400">
              ✦ 推荐使用 EPUB 文件，可获得完整六项结构化分析
            </p>
            <p className="text-xs text-gray-400">
              ✦ 较大的 PDF 可能上传失败，建议优先使用 EPUB 或压缩后的 PDF
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-50 font-medium"
          >
            {isLoading ? "解析中..." : "开始分析"}
          </button>

          {message && (() => {
            const isAnalyzing =
              isLoading ||
              isLoadingBookSummary ||
              isLoadingReadingGuide ||
              isLoadingViewMap ||
              isLoadingActionExtraction ||
              isLoadingViewValidation ||
              isLoadingIdeaSourceTracing;

            return (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm border transition-colors duration-300 ${
                  isAnalyzing
                    ? "bg-gray-50 border-gray-200 text-gray-700"
                    : message === "分析完成"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-gray-50 border-gray-100 text-gray-600"
                }`}
              >
                <span className="flex items-center gap-2">
                  {isAnalyzing && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-500" />
                    </span>
                  )}
                  {message === "分析完成" && !isAnalyzing && (
                    <span className="shrink-0 text-emerald-500">✓</span>
                  )}
                  {message}
                </span>
              </div>
            );
          })()}
        </section>

        {bookTitle && (
          <>
            {/* Book title bar */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 truncate">{bookTitle}</h2>
              {(!isLiteMode || isLiteUnlocked) && (
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {isExporting ? "导出中..." : "导出 Obsidian 知识包"}
                </button>
              )}
            </div>

            {/* View mode toggle */}
            {immersiveCardList.length > 0 && (
              <div className="flex items-center mb-8">
                <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode("card")}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                      viewMode === "card"
                        ? "bg-black text-white shadow-sm"
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
                        ? "bg-black text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    沉浸阅读
                  </button>
                </div>
              </div>
            )}

            {/* PDF Lite mode info banner (locked) */}
            {isLiteMode && !isLiteUnlocked && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                <span className="mt-0.5 text-amber-500 text-base shrink-0">ℹ</span>
                <p className="text-sm leading-6 text-amber-800">
                  <strong>PDF 简化分析模式</strong>
                  ：当前仅提供基础摘要与阅读引导。如需完整结构化分析，建议优先使用 EPUB 文件，或解锁当前 PDF 的完整版分析。
                </p>
              </div>
            )}

            {/* Paywall card */}
            {isLiteMode && !isLiteUnlocked && (
              <div className="mb-8 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  解锁完整版分析
                </p>
                <p className="text-base font-semibold text-gray-900 mb-4">
                  解锁后可获得以下深度分析内容
                </p>
                <ul className="space-y-2 mb-5">
                  {["观点地图", "行动提炼", "观点校验", "思想溯源", "Obsidian 知识包导出"].map(
                    (feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500 font-bold">✓</span>
                        {feature}
                      </li>
                    )
                  )}
                </ul>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-2xl font-bold text-gray-900">
                    ¥9.9
                    <span className="text-sm font-normal text-gray-400 ml-1">/ 本</span>
                  </span>
                  <button
                    onClick={() => setIsPaywallModalOpen(true)}
                    className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition active:scale-[0.98]"
                  >
                    立即解锁完整版
                  </button>
                </div>
              </div>
            )}

            {/* ── Immersive mode ── */}
            {viewMode === "immersive" && immersiveCardList.length > 0 && currentImmersiveCard && (
              <div
                className="mx-auto max-w-2xl mb-10"
                onTouchStart={handleImmersiveTouchStart}
                onTouchEnd={handleImmersiveTouchEnd}
              >
                {/* Progress indicator */}
                <p className="text-center text-xs text-gray-400 mb-4 select-none tracking-wider">
                  {safeImmersiveIndex + 1} / {immersiveCardList.length}
                </p>

                {/* Card */}
                <div
                  key={safeImmersiveIndex}
                  className={`rounded-2xl bg-white border border-gray-100 shadow-sm p-8 ${
                    slideDir === "left"
                      ? "animate-slide-from-right"
                      : slideDir === "right"
                      ? "animate-slide-from-left"
                      : ""
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
                    {currentImmersiveCard.label}
                  </p>
                  {currentImmersiveCard.isLoading ? (
                    <div className="space-y-3">
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-full" />
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-5/6" />
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-2/3" />
                      <p className="text-xs text-gray-400 pt-1">{currentImmersiveCard.loadingText}</p>
                    </div>
                  ) : (
                    <div className="md-prose">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {currentImmersiveCard.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Navigation row */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => navigateImmersive("prev")}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition active:scale-[0.97] select-none"
                  >
                    ← 上一篇
                  </button>

                  {/* Dot indicators */}
                  <div className="flex items-center gap-1.5">
                    {immersiveCardList.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSlideDir(i > safeImmersiveIndex ? "left" : "right");
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
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition active:scale-[0.97] select-none"
                  >
                    下一篇 →
                  </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-center text-[11px] text-gray-300 mt-3 select-none hidden md:block">
                  使用键盘 ← → 方向键切换
                </p>
              </div>
            )}

            {/* ── Card mode ── */}
            {viewMode === "card" && (
              <>
                {/* 阅读前 section */}
                {beforeReadingCards.length > 0 && (
                  <div className="mb-10">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
                      阅读前
                    </p>
                    <div className="flex items-start overflow-x-auto gap-4 pb-4 -mx-6 px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
                      {beforeReadingCards}
                    </div>
                  </div>
                )}

                {/* 阅读后 section */}
                {(!isLiteMode || isLiteUnlocked) && afterReadingCards.length > 0 && (
                  <div className="mb-10">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
                      阅读后
                    </p>
                    <div className="flex items-start overflow-x-auto gap-4 pb-4 -mx-6 px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
                      {afterReadingCards}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Payment modal */}
        {isPaywallModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsPaywallModalOpen(false);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-7 flex flex-col items-center gap-5">
              <div className="w-full">
                <p className="text-lg font-semibold text-gray-900 mb-1">支付解锁完整版分析</p>
                <p className="text-sm text-gray-500">请使用微信扫码支付 ¥9.9</p>
              </div>

              {/* QR code */}
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
                  className="w-full rounded-xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-800 transition active:scale-[0.98]"
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
        {/* Footer */}
        <footer className="mt-20 mb-4 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Richology商标黑体.png"
            alt="Richology"
            className="h-8 w-auto object-contain"
          />
        </footer>
      </div>
    </main>
  );
}

