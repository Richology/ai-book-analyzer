"use client";

const TESTIMONIALS = [
  {
    name: "张明",
    title: "产品经理 · 5 年经验",
    quote:
      "以前一本书要读两周，现在 30 秒就能抓到核心。不是替代阅读，而是让我知道该重点读哪里。观点地图特别好用，一眼就能看清整本书的逻辑脉络，省了大量时间。",
  },
  {
    name: "李薇",
    title: "创业者 · 教育行业",
    quote:
      "决策训练功能太惊艳了，不只是告诉你书里说了什么，还让你在真实场景里用起来。我把《原则》传上去以后，做了三道决策题，感觉比读完整本书收获还大。",
  },
  {
    name: "王浩",
    title: "咨询顾问 · 战略方向",
    quote:
      "我把团队必读的 5 本书都传了上去，导出的知识卡片直接变成了内部培训材料。行动提炼这张卡片特别实用，每本书都能提炼出可以立刻执行的动作清单。",
  },
  {
    name: "陈雨",
    title: "自由职业者 · 写作",
    quote:
      "观点地图帮我快速理清一本书的逻辑脉络，写书评的效率提升了不止一倍。思想溯源功能也很有意思，能看到一本书背后更深层的思考框架。",
  },
  {
    name: "赵磊",
    title: "技术总监 · 互联网",
    quote:
      "终于不用再为读不完书焦虑了。6 张卡片就是一本书的精华，随时可以回顾。最喜欢的是沉浸式阅读模式，左右滑动卡片的体验很流畅，像在翻一本精简版的书。",
  },
];

// Double for seamless loop
const ITEMS = [...TESTIMONIALS, ...TESTIMONIALS];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-16 md:py-24 overflow-hidden">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
            他们已经在用书跃
          </h2>
        </div>
      </div>

      {/* Marquee track — inline style to guarantee animation */}
      <div className="relative">
        <div
          className="flex gap-5"
          style={{
            animation: "marquee 45s linear infinite",
            width: "max-content",
          }}
        >
          {ITEMS.map((t, i) => (
            <article
              key={i}
              className="w-[340px] shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:[animation-play-state:paused]"
            >
              <svg
                className="mb-3 h-5 w-5 text-gray-200"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.3 2.6C6.1 5.1 3 9.8 3 15v6h8v-8H7c0-3.3 2-6.1 4.8-7.4L11.3 2.6zM23.3 2.6C18.1 5.1 15 9.8 15 15v6h8v-8h-4c0-3.3 2-6.1 4.8-7.4L23.3 2.6z" />
              </svg>
              <p className="mb-4 text-[13px] leading-6 text-gray-600">
                {t.quote}
              </p>
              <div className="flex items-center gap-3 border-t border-gray-50 pt-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-[11px] text-gray-400">{t.title}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
