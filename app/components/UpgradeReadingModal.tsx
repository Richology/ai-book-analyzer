"use client";

import { useEffect, useState } from "react";

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
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`relative mx-4 w-full max-w-md transform overflow-hidden rounded-3xl bg-white/90 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"
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

        <div className="relative p-7 sm:p-9 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-700 shadow-lg">
            <span className="text-2xl">🎁</span>
          </div>
          
          <h3 className="mb-2 text-xl font-bold text-gray-900">
            卡在了这个模式里？
          </h3>
          
          <div className="mb-6 space-y-3 text-[14px] leading-relaxed text-gray-600 text-left bg-gray-50/80 rounded-2xl p-5 border border-gray-100/50">
            <p>
              测试仅仅是发现问题的第一步。这背后往往隐藏着我们在真实生活中<strong className="text-gray-900 font-semibold">反复遇到的卡点</strong>。
            </p>
            <p>
              我是主理人安瑟。基于你的反馈模式，我整理了一份不对外公开的<strong className="text-gray-900 font-semibold">「破局专属进阶书单」</strong>。
            </p>
            <p>
              如果你想真正改变这个现状，不如加我个微信。我把书单发给你，顺便聊聊你的困局。
            </p>
          </div>

          <div className="mb-6 mx-auto w-44 h-44 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white p-2">
            <img 
              src={qrImageSrc} 
              alt="主理人微信二维码" 
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          <p className="text-sm text-gray-500 mb-3">扫描上方二维码，或复制微信添加</p>

          <button
            onClick={handleCopy}
            className={`mx-auto flex h-11 w-full max-w-[200px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium transition-all ${
              copySuccess 
                ? "border-emerald-200 bg-emerald-50 text-emerald-600" 
                : "text-gray-700 hover:bg-gray-50 hover:shadow-sm active:scale-95"
            }`}
          >
            {copySuccess ? (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                已复制微信号
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                复制微信号 {wechatId}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
