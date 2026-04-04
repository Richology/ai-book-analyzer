"use client";

import { TopNav } from "./components/landing/TopNav";
import { FloatingBooks } from "./components/landing/FloatingBooks";
import { BookComparison } from "./components/landing/BookComparison";
import { Testimonials } from "./components/landing/Testimonials";
import { NeedAHand } from "./components/landing/NeedAHand";
import { FAQ } from "./components/landing/FAQ";

export default function LandingPage() {
  return (
    <>
      <TopNav />

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-sky-50 to-violet-50 px-5">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -top-12 right-0 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-violet-200/20 blur-3xl" />

        {/* Floating book names (decoration only, no gift books) */}
        <FloatingBooks starterBooks={[]} experiencedIds={[]} onStarterBookDrop={() => {}} />

        {/* Center content — left/right layout */}
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-5 md:flex-row md:items-center md:justify-between md:gap-16 md:px-8">
          {/* Left: product name */}
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-950 sm:text-6xl md:text-7xl">
              书跃
            </h1>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 backdrop-blur-sm px-3 py-1 text-xs text-gray-400 shadow-sm">
              <span>✦</span> AI 驱动的结构化书籍分析
            </div>
          </div>

          {/* Right: slogan + CTA */}
          <div className="text-center md:text-left">
            <p className="text-xl font-medium text-gray-700 sm:text-2xl md:text-3xl">
              从好书中，完成认知跃迁
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 sm:text-base">
              上传一本电子书，30 秒获取 6 张结构化知识卡片
            </p>
            <div className="mt-8">
              <a
                href="/workspace"
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-gray-950 px-8 py-4 text-base font-semibold text-white shadow-xl transition-all hover:bg-gray-800 hover:shadow-2xl active:scale-[0.97] sm:text-lg"
              >
                开始使用
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product showcase ── */}
      <div className="bg-[#f7f7f8]">
        <BookComparison />
        <Testimonials />
        <FAQ />
      </div>

      {/* ── Bottom CTA ── */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center md:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            重新定义你的阅读方式
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            <span>无需注册，开箱即用</span>
            <span className="hidden md:inline">·</span>
            <span>内容不留存，完全私有</span>
            <span className="hidden md:inline">·</span>
            <span>30 秒出结果</span>
          </div>
          <a
            href="/workspace"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-medium text-gray-900 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl active:scale-[0.98]"
          >
            立即免费开始
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#f7f7f8] py-8 flex flex-col items-center gap-3">
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

      <NeedAHand />
    </>
  );
}
