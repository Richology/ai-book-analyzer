"use client";

const PAIN_POINTS = [
  {
    emoji: "📚",
    pain: "买了很多书，但大部分没读完",
    resolve: "30 秒提取一本书的核心，不读完也能用起来",
  },
  {
    emoji: "😵‍💫",
    pain: "读完了，但说不清到底讲了什么",
    resolve: "6 张结构化卡片，帮你把模糊的记忆变成清晰的认知",
  },
  {
    emoji: "🤔",
    pain: "知道读书有用，但不知道怎么用到现实里",
    resolve: "行动提炼 + 决策训练，让书中的道理变成你的下一步动作",
  },
];

export function ValueProp() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        {/* Headline */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
            如果你也有这样的感觉
          </h2>
          <p className="mt-3 text-base text-gray-500">
            书跃就是为你做的
          </p>
        </div>

        {/* Pain → Resolve cards */}
        <div className="space-y-4">
          {PAIN_POINTS.map((item) => (
            <div
              key={item.pain}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-card"
            >
              <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:gap-6">
                {/* Pain side */}
                <div className="flex flex-1 items-start gap-3">
                  <span className="mt-0.5 text-2xl">{item.emoji}</span>
                  <p className="text-[15px] font-medium leading-relaxed text-gray-800">
                    「{item.pain}」
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden md:block">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Resolve side */}
                <div className="flex-1 rounded-xl bg-gradient-to-r from-amber-50/60 via-sky-50/60 to-violet-50/60 px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-600">
                    {item.resolve}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400">
            不需要读完整本书，也能把书里最有价值的东西用起来
          </p>
        </div>
      </div>
    </section>
  );
}
