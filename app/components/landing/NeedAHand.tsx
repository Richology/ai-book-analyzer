"use client";

import { useState } from "react";

const OPTIONS = [
  { icon: "📚", label: "这些书值得一读，推荐给你" },
  { icon: "🔖", label: "如何获取电子书" },
  { icon: "☕", label: "工作或生活遇到难题？来聊聊" },
];

const WECHAT_ID = "iwbr1988";

export function NeedAHand() {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = WECHAT_ID;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Panel */}
      {isOpen && (
        <div className="w-72 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
          {showQR ? (
            /* ── QR code view ── */
            <div>
              <button
                onClick={() => setShowQR(false)}
                className="mb-4 flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                返回
              </button>
              {/* QR code */}
              <div className="mx-auto mb-4 h-44 w-44 overflow-hidden rounded-xl border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/wechat-qr-only.png"
                  alt="微信二维码"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    微信号：<span className="font-medium text-gray-900">{WECHAT_ID}</span>
                  </span>
                  <button
                    onClick={handleCopy}
                    className="rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500 transition-all hover:border-gray-300 hover:text-gray-700 active:scale-95"
                  >
                    {copied ? "已复制 ✓" : "复制"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  扫码或搜索微信号添加
                </p>
              </div>
            </div>
          ) : (
            /* ── Options view ── */
            <>
              <div className="mb-4 flex items-center gap-3">
                {/* Placeholder avatar — replace with real photo later */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  安
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    嗨，我是安瑟
                  </p>
                  <p className="text-xs text-gray-400">书跃的主理人</p>
                </div>
              </div>
              <div className="space-y-2">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setShowQR(true)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 px-3.5 py-2.5 text-left text-sm text-gray-700 transition-all hover:border-gray-200 hover:bg-gray-50 active:scale-[0.99]"
                  >
                    <span className="text-base">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setShowQR(false);
        }}
        className="flex h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 shadow-lg transition-all hover:shadow-xl active:scale-95"
      >
        {isOpen ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              需要帮助？
            </span>
          </>
        )}
      </button>
    </div>
  );
}
