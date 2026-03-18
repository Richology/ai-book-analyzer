"use client";

import { useRef, useState } from "react";

const CARD_W = 540;
const CARD_FONT =
  "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

export function BookShareModal({
  bookTitle,
  recommendation,
  onClose,
}: {
  bookTitle: string;
  recommendation: string;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      const safeName = `${bookTitle.slice(0, 16)}-整书分享-书跃`.replace(
        /[/\\:*?"<>|]/g,
        ""
      );
      a.download = `${safeName}.png`;
      a.click();
    } catch (err) {
      console.error("保存失败:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Split recommendation into paragraphs, filter empty lines
  const paragraphs = recommendation
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        padding: "20px 16px",
        fontFamily: CARD_FONT,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal shell */}
      <div
        style={{
          width: "100%",
          maxWidth: 596,
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 32px 96px rgba(0,0,0,0.28)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #f3f4f6",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#111827",
              margin: 0,
            }}
          >
            整书分享卡预览
          </p>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable preview area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "auto",
            padding: "24px 28px",
            background: "#f4f4f5",
          }}
        >
          {/* ── Book share card (captured by html2canvas) ── */}
          <div
            ref={cardRef}
            style={{
              width: CARD_W,
              background: "#ffffff",
              borderRadius: 20,
              boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
              fontFamily: CARD_FONT,
              display: "flex",
              flexDirection: "column",
              margin: "0 auto",
            }}
          >
            {/* Top: dark branded header */}
            <div
              style={{
                background: "linear-gradient(150deg,#0f172a 0%,#1e293b 100%)",
                padding: "32px 40px 30px",
                borderRadius: "20px 20px 0 0",
              }}
            >
              {/* Brand + slogan */}
              <p
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  margin: "0 0 16px 0",
                  lineHeight: 1,
                }}
              >
                书跃 · BookLeap &nbsp;·&nbsp; 从好书中完成认知跃迁
              </p>

              {/* Book title */}
              <p
                style={{
                  color: "#ffffff",
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  margin: 0,
                  letterSpacing: "0.01em",
                  wordBreak: "break-all",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {bookTitle}
              </p>
            </div>

            {/* Thin accent line */}
            <div
              style={{
                height: 3,
                background:
                  "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#06b6d4 100%)",
              }}
            />

            {/* Middle: recommendation text */}
            <div
              style={{
                padding: "32px 40px 28px",
                background: "#ffffff",
              }}
            >
              {paragraphs.length === 0 ? (
                <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>
                  暂无内容
                </p>
              ) : (
                paragraphs.map((para, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 14.5,
                      color: "#1f2937",
                      lineHeight: 1.95,
                      margin:
                        i === paragraphs.length - 1 ? 0 : "0 0 16px 0",
                      padding: 0,
                      wordBreak: "break-all",
                    }}
                  >
                    {para}
                  </p>
                ))
              )}
            </div>

            {/* Footer: logo */}
            <div
              style={{
                padding: "14px 40px 24px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#ffffff",
                borderRadius: "0 0 20px 20px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Richology商标黑体.png"
                alt="Richology"
                style={{ height: 16, opacity: 0.28, objectFit: "contain" }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            gap: 12,
            padding: "16px 24px",
            borderTop: "1px solid #f3f4f6",
            background: "#ffffff",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "transparent",
              padding: "10px 0",
              fontSize: 14,
              color: "#6b7280",
              cursor: "pointer",
              fontFamily: CARD_FONT,
            }}
          >
            关闭
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              borderRadius: 12,
              border: "none",
              background: isSaving ? "#9ca3af" : "#111827",
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              cursor: isSaving ? "default" : "pointer",
              fontFamily: CARD_FONT,
            }}
          >
            {isSaving ? "保存中…" : "保存图片"}
          </button>
        </div>
      </div>
    </div>
  );
}
