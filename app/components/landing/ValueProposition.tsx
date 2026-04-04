"use client";

const PAIN_POINTS = [
  {
    thought: "买了很多书，但大部分都没读完",
    response: "传上来，30 秒后你就知道这本书最值得你用的是什么",
  },
  {
    thought: "读完了，但过几天就忘了书里讲什么",
    response: "6 张结构化卡片帮你把一本书压缩成可以随时回顾的知识",
  },
  {
    thought: "知道读书有用，但就是读不进去",
    response: "不用读完也能用起来 — 先拿到核心，再决定要不要深读",
  },
];

export function ValueProposition() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
            如果你也有这样的感觉
          </h2>
          <p className="mt-3 text-sm text-gray-400">
            那书跃就是为你做的
          </p>
        </div>

        {/* Pain point cards */}
        <div className="space-y-5">
          {PAIN_POINTS.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              {/* User's inner thought */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                    💭
                  </span>
                  <p className="text-[15px] font-medium leading-relaxed text-gray-800">
                    「{item.thought}」
                  </p>
                </div>
              </div>
              {/* BookLeap's response */}
              <div className="bg-gradient-to-r from-amber-50/60 via-sky-50/60 to-violet-50/60 px-6 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
                    跃
                  </span>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {item.response}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
          >
            上传你的第一本书
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
