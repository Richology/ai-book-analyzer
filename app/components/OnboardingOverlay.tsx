"use client";

import { useState, useEffect } from "react";

const ONBOARDING_KEY = "bookleap_onboarding_done";

export type OnboardingStep =
  | "success"
  | "cards"
  | "cards-done"
  | "export-done"
  | "poster"
  | null;

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch { /* ignore */ }
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/* ── Toast notification ── */
function Toast({
  emoji,
  title,
  subtitle,
  cta,
  onAction,
  isMobile,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  cta?: string;
  onAction?: () => void;
  isMobile: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9990,
        ...(isMobile
          ? { bottom: 20, left: 16, right: 16 }
          : { bottom: 24, right: 24, maxWidth: 360 }),
        padding: "14px 20px",
        borderRadius: 14,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        cursor: onAction ? "pointer" : "default",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
      onClick={onAction}
      role={onAction ? "button" : undefined}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
        {emoji}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              margin: "4px 0 0",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
        {cta && (
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
              margin: "6px 0 0",
              lineHeight: 1.4,
            }}
          >
            {cta} →
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Inline hint (for card browsing) ── */
function InlineHint({
  children,
  isMobile,
}: {
  children: React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9990,
        ...(isMobile
          ? { bottom: 20, left: 16, right: 16 }
          : { bottom: 24, right: 24, maxWidth: 320 }),
        padding: "10px 18px",
        borderRadius: 12,
        background: "rgba(17,24,39,0.85)",
        backdropFilter: "blur(8px)",
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.5,
        textAlign: isMobile ? "center" : "left",
      }}
    >
      {children}
    </div>
  );
}

/* ── Main overlay ── */
export function OnboardingOverlay({
  step,
  cardIndex,
  cardTotal,
  onScrollToCards,
  onGoToExport,
  onGoToPoster,
  onDismiss,
}: {
  step: OnboardingStep;
  cardIndex: number;
  cardTotal: number;
  onScrollToCards: () => void;
  onGoToExport: () => void;
  onGoToPoster: () => void;
  onDismiss: () => void;
}) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (step) {
      const t = setTimeout(() => setVisible(true), 150);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [step]);

  // Auto-dismiss toasts (not the card hint which updates live)
  useEffect(() => {
    if (!step || step === "cards") return;
    const duration = step === "poster" ? 4000 : 5000;
    const t = setTimeout(() => onDismiss(), duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!step || !visible) return null;

  if (step === "success") {
    return (
      <Toast
        emoji="🎉"
        title="第一本书分析完成！"
        subtitle="你已经开始建立自己的知识体系"
        cta="查看核心卡片"
        onAction={onScrollToCards}
        isMobile={isMobile}
      />
    );
  }

  if (step === "cards") {
    const hint = isMobile
      ? `👉 左右滑动查看卡片（${cardIndex + 1}/${cardTotal}）`
      : `👉 点击按钮或使用方向键查看卡片（${cardIndex + 1}/${cardTotal}）`;
    return <InlineHint isMobile={isMobile}>{hint}</InlineHint>;
  }

  if (step === "cards-done") {
    return (
      <Toast
        emoji="🎯"
        title="已完成阅读"
        cta="导出你的知识包"
        onAction={onGoToExport}
        isMobile={isMobile}
      />
    );
  }

  if (step === "export-done") {
    return (
      <Toast
        emoji="📦"
        title="知识包已生成"
        cta="试试把它做成分享海报"
        onAction={onGoToPoster}
        isMobile={isMobile}
      />
    );
  }

  if (step === "poster") {
    return (
      <Toast
        emoji="🔥"
        title="把精华分享出去吧"
        subtitle="送给自己或者需要的朋友"
        isMobile={isMobile}
      />
    );
  }

  return null;
}

/* ── No longer need injected keyframes — using inline transitions ── */
export function OnboardingStyles() {
  return null;
}
