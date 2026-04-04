"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "为什么推荐上传 EPUB 而不是 PDF？",
    a: "EPUB 文件包含完整的章节结构信息，书跃可以按章节精准解析，生成全部 6 项结构化分析。PDF 文件缺少章节元数据，只能按固定字数分块处理，解析效果有限，且较大的 PDF 可能导致上传失败。如果你手里只有 PDF，建议先压缩后再上传。",
  },
  {
    q: "上传的文件安全吗？",
    a: "你上传的电子书文件仅用于本次分析，分析完成后不会在服务器上长期存储。我们不会将你的文件分享给任何第三方。所有分析结果保存在你的浏览器本地存储中，只有你自己可以访问。",
  },
  {
    q: "分析结果可以导出吗？",
    a: "可以。书跃支持三种导出格式：Markdown、纯文本和 JSON。你可以选择导出全部 6 张卡片或单独导出某几张，也可以选择合并为单文件或分文件导出。Markdown 格式可以直接导入 Obsidian、Notion 等知识库工具。",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-2xl px-5 md:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
            常见问题
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-card"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="pr-4 text-sm font-medium text-gray-900">
                    {item.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-6 text-gray-500">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
