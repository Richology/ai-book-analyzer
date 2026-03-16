"use client";

import { useState } from "react";

type Chapter = {
  id: string;
  title: string;
  text: string;
  summary?: string;
};

export default function Home() {
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
  const [isLoadingReadingGuide, setIsLoadingReadingGuide] = useState(false);
  const [isLoadingViewMap, setIsLoadingViewMap] = useState(false);
  const [isLoadingActionExtraction, setIsLoadingActionExtraction] = useState(false);
  const [isLoadingViewValidation, setIsLoadingViewValidation] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setMessage("");
      setBookTitle("");
      setViewMap("");
      setIsLoadingViewMap(false);
      setReadingGuide("");
      setIsLoadingReadingGuide(false);
      setActionExtraction("");
      setIsLoadingActionExtraction(false);
      setCriticalExamination("");
      setIsLoadingViewValidation(false);
      setIdeaSourceTracing("");
      setBookSummary("");
      setChapters([]);
      return;
    }

    const isValidType =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".epub");

    if (!isValidType) {
      setSelectedFile(null);
      setMessage("仅支持上传 PDF 或 EPUB 文件。");
      setBookTitle("");
      setViewMap("");
      setIsLoadingViewMap(false);
      setReadingGuide("");
      setIsLoadingReadingGuide(false);
      setActionExtraction("");
      setIsLoadingActionExtraction(false);
      setCriticalExamination("");
      setIsLoadingViewValidation(false);
      setIdeaSourceTracing("");
      setBookSummary("");
      setChapters([]);
      return;
    }

    setSelectedFile(file);
    setMessage("");
    setBookTitle("");
    setViewMap("");
    setIsLoadingViewMap(false);
    setReadingGuide("");
    setIsLoadingReadingGuide(false);
    setActionExtraction("");
    setIsLoadingActionExtraction(false);
    setCriticalExamination("");
    setIsLoadingViewValidation(false);
    setIdeaSourceTracing("");
    setChapters([]);
  };

  const fetchViewValidation = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[]
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
    chapters: Chapter[]
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
      fetchViewValidation(title, bookSummary, chapters);
    }
  };

  const fetchViewMap = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[]
  ) => {
    try {
      setIsLoadingViewMap(true);

      const res = await fetch("/api/skills/view-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bookSummary, chapters }),
      });

      const data = await res.json();

      if (data.success) {
        setViewMap(data.viewMap || "");
      }
    } catch (error) {
      console.error("观点地图生成失败:", error);
    } finally {
      setIsLoadingViewMap(false);
      fetchActionExtraction(title, bookSummary, chapters);
    }
  };

  const fetchReadingGuide = async (
    title: string,
    bookSummary: string,
    chapters: Chapter[]
  ) => {
    try {
      setIsLoadingReadingGuide(true);

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
      fetchViewMap(title, bookSummary, chapters);
    }
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
          readingGuide,
          viewMap,
          actionExtraction,
          bookSummary,
          chapters,
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
      setMessage("正在上传并解析章节...");
      setBookTitle("");
      setViewMap("");
      setIsLoadingViewMap(false);
      setReadingGuide("");
      setIsLoadingReadingGuide(false);
      setActionExtraction("");
      setIsLoadingActionExtraction(false);
      setCriticalExamination("");
      setIsLoadingViewValidation(false);
      setIdeaSourceTracing("");
      setBookSummary("");
      setChapters([]);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.error || "上传失败");
        return;
      }

      const title = data.title || "";
      const bookSummary = data.bookSummary || "";
      const chapters = data.chapters || [];

      setMessage(`文件解析成功：${data.filename}`);
      setBookTitle(title);
      setBookSummary(bookSummary);
      setChapters(chapters);

      fetchReadingGuide(title, bookSummary, chapters);
    } catch (error) {
      console.error(error);
      setMessage("请求失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4">AI Book Analyzer</h1>
          <p className="text-gray-600 max-w-2xl mx-auto leading-7">
            上传一本电子书，自动生成阅读指南、观点地图、思想溯源、行动提炼与反方检验，
            将书籍转化为结构化知识。
          </p>
        </header>

        <section className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100 mb-8">
          <label className="block mb-3 text-sm font-medium text-gray-700">
            选择电子书文件
          </label>

          <input
            type="file"
            accept=".pdf,.epub,application/pdf"
            onChange={handleFileChange}
            className="mb-4 w-full block text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-white hover:file:bg-gray-800"
          />

          <div className="min-h-[48px] mb-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 border border-gray-100">
            {selectedFile ? (
              <span>
                已选择：<strong>{selectedFile.name}</strong>
              </span>
            ) : (
              <span>尚未选择文件</span>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
          >
            {isLoading ? "解析中..." : "开始分析"}
          </button>

          {message && (
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 border border-gray-100">
              {message}
            </div>
          )}
        </section>

        {bookTitle && (
          <section className="bg-white shadow-sm rounded-2xl p-8 border border-gray-100">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-2xl font-semibold">{bookTitle}</h2>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition disabled:opacity-60"
              >
                {isExporting ? "导出中..." : "导出 Obsidian 知识包"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              已解析章节：{chapters.length} 个
            </p>

            {(isLoadingReadingGuide || readingGuide) && (
              <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  阅读指南
                </p>
                {isLoadingReadingGuide ? (
                  <p className="text-sm text-gray-400 animate-pulse">正在生成阅读指南...</p>
                ) : (
                  <div className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                    {readingGuide}
                  </div>
                )}
              </div>
            )}

            {(isLoadingViewMap || viewMap) && (
              <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  观点地图
                </p>
                {isLoadingViewMap ? (
                  <p className="text-sm text-gray-400 animate-pulse">正在生成观点地图...</p>
                ) : (
                  <div className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                    {viewMap}
                  </div>
                )}
              </div>
            )}

            {(isLoadingActionExtraction || actionExtraction) && (
              <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  行动提炼
                </p>
                {isLoadingActionExtraction ? (
                  <p className="text-sm text-gray-400 animate-pulse">正在生成行动提炼...</p>
                ) : (
                  <div className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                    {actionExtraction}
                  </div>
                )}
              </div>
            )}

            {(isLoadingViewValidation || criticalExamination) && (
              <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  观点校验
                </p>
                {isLoadingViewValidation ? (
                  <p className="text-sm text-gray-400 animate-pulse">正在生成观点校验...</p>
                ) : (
                  <div className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                    {criticalExamination}
                  </div>
                )}
              </div>
            )}

            {ideaSourceTracing && (
              <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  思想溯源
                </p>
                <div className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                  {ideaSourceTracing}
                </div>
              </div>
            )}

            {bookSummary && (
              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  全书摘要
                </p>
                <div className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                  {bookSummary}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {chapters.map((chapter, index) => (
                <details
                  key={chapter.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-5"
                >
                  <summary className="cursor-pointer font-medium text-gray-900">
                    第 {index + 1} 章：{chapter.title}
                  </summary>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                        章节摘要
                      </p>
                      <div className="rounded-lg bg-white p-4 text-sm leading-7 text-gray-700 border border-gray-100">
                        {chapter.summary || "暂无摘要"}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                        章节正文预览
                      </p>
                      <div className="text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                        {chapter.text}
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}