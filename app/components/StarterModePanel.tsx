"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { StarterBookData } from "@/src/data/starterBooks";

export function StarterModePanel({
  books,
  isLoading,
  loadingStep,
  selectedBookId,
  onSelectBook,
  onChooseUpload,
}: {
  books: StarterBookData[];
  isLoading: boolean;
  loadingStep: string;
  selectedBookId: string;
  onSelectBook: (bookId: string) => void;
  onChooseUpload: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }
    // 缓动进度条：快速到 60%，然后慢慢到 90%，完成时跳到 100%
    setProgress(0);
    const t1 = setTimeout(() => setProgress(30), 200);
    const t2 = setTimeout(() => setProgress(55), 800);
    const t3 = setTimeout(() => setProgress(75), 1600);
    const t4 = setTimeout(() => setProgress(90), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [isLoading]);

  return (
    <section id="starter-books-section" className="mb-10 overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-card">
      <div className="px-6 pt-5 pb-3 text-center md:px-8 md:pt-6 md:pb-4">
        <h2 className="mt-2 text-[1.7rem] font-bold tracking-tight text-gray-950 md:text-[2rem]">
          我们送你 3 本好书，任选一本开始分析
        </h2>
        <p className="mt-2 text-sm text-gray-400 md:text-[15px]">
          不用先找电子书文件
        </p>
      </div>

      <div className="px-5 pb-5 md:px-8 md:pb-6">
        {isLoading ? (
          <div className="rounded-[24px] border border-gray-100 bg-gray-50/80 px-6 py-10 text-center md:px-10 md:py-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-gray-700" />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-950 md:text-xl">
              正在为你准备这本书
            </h3>
            <p className="mt-2 text-sm leading-7 text-gray-500 transition-opacity duration-300">{loadingStep}</p>
            {/* 进度条 */}
            <div className="mx-auto mt-5 h-1.5 max-w-[240px] overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-700 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
              {books.map((book) => (
                <article
                  key={book.id}
                  className="group min-w-[78vw] max-w-[78vw] shrink-0 snap-center overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover md:min-w-0 md:max-w-none"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 md:aspect-[4/4.7]">
                    <Image
                      src={book.coverImage}
                      alt={book.title}
                      fill
                      sizes="(max-width: 768px) 78vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-3 px-5 py-4 md:space-y-3.5 md:px-4 md:py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-950">{book.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">作者：{book.author}</p>
                    </div>
                    <p className="text-sm leading-6 text-gray-600">{book.recommendation}</p>
                    <button
                      onClick={() => onSelectBook(book.id)}
                      className="w-full rounded-2xl bg-gray-950 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.99]"
                    >
                      {selectedBookId === book.id ? "正在进入…" : "开始分析"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-3 text-center text-xs text-gray-400 md:hidden">
              左右滑动选择书籍
            </p>

            <div className="mt-5 text-center">
              <button
                onClick={onChooseUpload}
                className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
              >
                或上传你自己的书 →
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
