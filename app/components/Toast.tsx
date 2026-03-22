"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function Toast({
  message,
  actionText,
  onAction,
  onClose,
  durationMs = 10000,
  showCloseButton = true,
  dismissible = true,
}: {
  message: string | ReactNode;
  actionText?: string;
  onAction?: () => void;
  onClose: () => void;
  durationMs?: number;
  showCloseButton?: boolean;
  dismissible?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearCloseTimer();
    setVisible(false);
    window.setTimeout(() => {
      onClose();
    }, 220);
  }, [clearCloseTimer, onClose]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));

    if (Number.isFinite(durationMs) && durationMs > 0) {
      closeTimerRef.current = window.setTimeout(() => {
        dismiss();
      }, durationMs);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearCloseTimer();
    };
  }, [clearCloseTimer, dismiss, durationMs]);

  return (
    <div
      className={`fixed z-[9990] bottom-4 left-1/2 w-[min(calc(100vw-24px),420px)] -translate-x-1/2 rounded-2xl border border-white/70 bg-white/92 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.14)] backdrop-blur-md transition-all duration-200 md:bottom-6 md:left-auto md:right-6 md:w-[380px] md:translate-x-0 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-900/75" />
        <div className="min-w-0 flex-1 text-sm leading-6 text-gray-700">
          {typeof message === "string" ? (
            <p className="whitespace-pre-line">{message}</p>
          ) : (
            message
          )}

          {(actionText || onAction) && (
            <div className="mt-3 flex items-center gap-3">
              {actionText && onAction && (
                <button
                  onClick={() => {
                    onAction();
                    dismiss();
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-white hover:text-gray-950"
                >
                  {actionText}
                </button>
              )}
            </div>
          )}
        </div>
        {showCloseButton && (
          <button
            onClick={() => {
              if (!dismissible) return;
              dismiss();
            }}
            className="shrink-0 rounded-full p-1 text-gray-300 transition-colors hover:text-gray-500"
            aria-label="关闭提示"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
