"use client";

import { useEffect, useRef, useState } from "react";

/* ── 81 本好书书名 ── */
const BOOK_NAMES = [
  "银河系搭车客指南", "大师的盛宴", "2001太空漫游", "献给阿尔吉侬的花束", "火星救援",
  "索拉里斯星", "乔布斯传", "马斯克传", "穷查理宝典", "精益创业",
  "不要上当：金融诈骗简史", "小岛经济学", "金钱心理学", "纳瓦尔宝典", "仿生人会梦见电子羊吗",
  "雪崩", "华氏451", "基地", "沙丘", "机器人三部曲",
  "星船伞兵", "三体", "北京折叠", "一九八四", "美丽新世界",
  "我们", "挽救计划", "西班牙乞丐", "美的历程", "艺术的故事",
  "真需求", "塔勒布全集", "思考，快与慢", "定位", "华与华方法",
  "投资第一课", "娱乐至死", "创新公司", "事实", "国民经济学原理",
  "人的行为", "怪诞行为学", "现代艺术150年", "看见艺术家", "公正",
  "洞穴奇案", "美国秩序的根基", "自由的基因", "武士道", "极简欧洲史",
  "王鼎钧四部曲", "乡关何处", "从文自传", "李诞脱口秀工作手册", "聪明人的个人成长",
  "津巴多普通心理学", "红书", "从公司到国家", "正见", "鱼不存在",
  "蛤蟆先生去看心理医生", "惶然录", "漫步华尔街", "价值投资实战手册", "哲学家的最后一课",
  "新华字典", "和繁重的工作一起修行", "世上为什么要有图书馆", "流血的仕途", "预期收益",
  "希腊神话", "沉思录", "舒克舌战贝塔", "基督山伯爵", "教学勇气",
  "活出生命的意义", "生命的沉思", "帕斯卡尔思想录", "草原上的小木屋", "服务的细节",
  "从「绝望」开始",
];

interface StarterBook {
  id: string;
  title: string;
  coverImage: string;
}

interface FloatingBooksProps {
  starterBooks: StarterBook[];
  experiencedIds: string[];
  onStarterBookDrop: (bookId: string) => void;
}

interface Bubble {
  id: number;
  text: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  drift: number;
}

export function FloatingBooks({ starterBooks, experiencedIds, onStarterBookDrop }: FloatingBooksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const animRef = useRef<number>(0);
  const [draggedBook, setDraggedBook] = useState<string | null>(null);

  // Initialize bubbles
  useEffect(() => {
    const initial: Bubble[] = BOOK_NAMES.map((name, i) => ({
      id: i,
      text: name,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 10 + Math.random() * 6, // 10-16px
      opacity: 0.08 + Math.random() * 0.14, // 0.08-0.22
      speed: 0.015 + Math.random() * 0.025, // slow upward drift
      drift: (Math.random() - 0.5) * 0.01, // slight horizontal drift
    }));
    setBubbles(initial);
  }, []);

  // Animate bubbles
  useEffect(() => {
    if (bubbles.length === 0) return;

    let running = true;
    const animate = () => {
      if (!running) return;
      setBubbles((prev) =>
        prev.map((b) => ({
          ...b,
          y: b.y - b.speed < -5 ? 105 : b.y - b.speed,
          x: b.x + b.drift,
        }))
      );
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [bubbles.length]);

  const handleDragStart = (e: React.DragEvent, bookId: string) => {
    e.dataTransfer.setData("starter-book-id", bookId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedBook(bookId);
  };

  const handleDragEnd = () => {
    setDraggedBook(null);
  };

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Floating book name bubbles */}
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="absolute whitespace-nowrap font-medium text-gray-600 select-none"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            fontSize: `${b.size}px`,
            opacity: b.opacity,
            transition: "opacity 0.3s",
          }}
        >
          {b.text}
        </span>
      ))}

      {/* 3 draggable starter book covers */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-4 md:gap-6">
        {starterBooks.filter((b) => !experiencedIds.includes(b.id)).map((book, i) => (
          <div
            key={book.id}
            draggable
            onDragStart={(e) => handleDragStart(e, book.id)}
            onDragEnd={handleDragEnd}
            className={`group relative cursor-grab active:cursor-grabbing transition-all duration-300 ${
              draggedBook === book.id ? "opacity-40 scale-90" : "hover:-translate-y-2 hover:shadow-xl"
            }`}
            style={{
              // Stagger heights slightly for visual interest
              transform: `translateY(${i === 1 ? -8 : 0}px)`,
            }}
          >
            {/* Gift badge */}
            <div className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] shadow-sm">
              🎁
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.coverImage}
              alt={book.title}
              className="h-28 w-auto rounded-lg shadow-lg ring-1 ring-black/5 transition-shadow md:h-36"
            />
            <p className="mt-1.5 text-center text-[10px] font-medium text-gray-500 md:text-xs">
              {book.title}
            </p>
          </div>
        ))}
      </div>

      {/* Drag hint — only show when there are gift books and none experienced yet */}
      {starterBooks.length > 0 && experiencedIds.length === 0 && (
      <div className="pointer-events-none absolute bottom-36 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:bottom-44">
        {/* Bouncing arrow */}
        <svg
          width="24"
          height="40"
          viewBox="0 0 24 40"
          fill="none"
          className="animate-bounce text-gray-400"
        >
          <path
            d="M12 38V6M12 6L4 14M12 6L20 14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 shadow-sm">
          🎁 送你 3 本好书 · 拖到上方开始体验
        </span>
      </div>
      )}
    </div>
  );
}
