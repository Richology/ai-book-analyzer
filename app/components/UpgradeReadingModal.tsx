"use client";

import { useEffect, useState } from "react";

const floatAnimationStyles = `
@keyframes libraryFloat {
  0%, 100% { transform: translateY(0) scale(var(--scale-factor)); }
  50% { transform: translateY(-12px) scale(var(--scale-factor)); }
}
.animate-library-float {
  animation: libraryFloat 7s ease-in-out infinite;
}
`;

const ADVANCED_BOOKS = [
  { title: "认知觉醒", author: "周岭" },
  { title: "原则", author: "瑞·达利欧" },
  { title: "思考，快与慢", author: "丹尼尔·卡尼曼" },
  { title: "纳瓦尔宝典", author: "埃里克·乔根森" },
  { title: "心流", author: "米哈里" },
  { title: "刻意练习", author: "安德斯·艾利克森" },
  { title: "被讨厌的勇气", author: "岸见一郎" },
  { title: "非暴力沟通", author: "马歇尔·卢森堡" },
  { title: "金字塔原理", author: "芭芭拉·明托" },
  { title: "穷查理宝典", author: "查理·芒格" },
];

const FLOATING_POSITIONS = [
  { top: "12%", left: "8%", delay: "0s", scale: 0.95, opacity: 0.5 },
  { top: "22%", right: "8%", delay: "1.2s", scale: 1.1, opacity: 0.6 },
  { top: "45%", left: "4%", delay: "2.5s", scale: 1.0, opacity: 0.8 },
  { top: "35%", right: "6%", delay: "1.5s", scale: 1.2, opacity: 0.5 },
  { top: "72%", left: "10%", delay: "3.1s", scale: 1.05, opacity: 0.65 },
  { top: "15%", left: "35%", delay: "1.7s", scale: 0.8, opacity: 0.4 },
  { top: "65%", right: "12%", delay: "0.8s", scale: 0.85, opacity: 0.55 },
  { top: "82%", right: "25%", delay: "2.1s", scale: 0.95, opacity: 0.7 },
  { top: "5%", right: "25%", delay: "0.5s", scale: 1.15, opacity: 0.45 },
  { top: "55%", left: "25%", delay: "2.8s", scale: 0.9, opacity: 0.5 },
];

function FloatingLibraryBackground() {
  return (
    <>
      <style>{floatAnimationStyles}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {ADVANCED_BOOKS.map((book, idx) => {
          const pos = FLOATING_POSITIONS[idx % FLOATING_POSITIONS.length];
          return (
            <div
              key={idx}
              className="absolute inline-flex flex-col items-center justify-center rounded-2xl border border-white/30 bg-white/20 px-5 py-3 shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] backdrop-blur-md animate-library-float"
              style={{
                top: pos.top,
                left: pos.left,
                right: pos.right,
                opacity: pos.opacity,
                animationDelay: pos.delay,
                ["--scale-factor" as any]: pos.scale,
              }}
            >
              <span className="text-[15px] font-bold text-white tracking-wide drop-shadow-md">{book.title}</span>
              <span className="text-[11px] font-medium text-white/80 mt-1">{book.author}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function UpgradeReadingModal({
  isOpen,
  onClose,
  wechatId = "iwbr1988",
  qrImageSrc = "/wechat-qr.png",
}: {
  isOpen: boolean;
  onClose: () => void;
  wechatId?: string;
  qrImageSrc?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(wechatId).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <FloatingLibraryBackground />

      <div
        className={`relative z-10 mx-4 w-full max-w-md transform overflow-hidden rounded-3xl bg-white/90 shadow-2xl backdrop-blur-2xl transition-all duration-500 ${
          isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative header blur */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl"></div>
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full bg-gray-100/80 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
          aria-label="关闭"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative max-h-[90vh] overflow-y-auto p-6 sm:p-8 text-center scrollbar-hide">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-700 shadow-md">
            <span className="text-xl">🎁</span>
          </div>
          
          <h3 className="mb-2 text-lg font-bold text-gray-900">
            卡在了这个模式里？
          </h3>
          
          <div className="mb-5 space-y-2 text-[13px] leading-relaxed text-gray-600 text-left bg-gray-50/80 rounded-2xl p-4 border border-gray-100/50">
            <p>
              测试仅仅是第一步。这背后往往隐藏着真实生活中<strong className="text-gray-900 font-semibold">反复遇到的卡点</strong>。
            </p>
            <p>
              我是主理人安瑟。基于你的反馈模式，我为你准备了一份<strong className="text-gray-900 font-semibold">「破局专属进阶书单」</strong>。
            </p>
            <p>
              如果你想改变现状，不如加个微信聊聊，我把书单发你。
            </p>
          </div>

          <div className="mb-4 mx-auto w-full max-w-[200px] h-48 sm:h-52 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white p-2 flex items-center justify-center">
            <img 
              src={qrImageSrc} 
              alt="主理人微信二维码" 
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-xs text-gray-400 mb-3">扫描上方二维码，或复制微信添加</p>

          <button
            onClick={handleCopy}
            className={`mx-auto flex h-10 w-full max-w-[200px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium transition-all ${
              copySuccess 
                ? "border-emerald-200 bg-emerald-50 text-emerald-600" 
                : "text-gray-700 hover:bg-gray-50 hover:shadow-sm active:scale-95"
            }`}
          >
            {copySuccess ? (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                已复制微信号
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                复制微信号 {wechatId}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
