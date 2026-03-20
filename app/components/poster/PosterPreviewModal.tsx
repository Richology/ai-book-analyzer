"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PosterData, PosterTemplate } from "./types";
import { MinimalWhitePoster } from "./MinimalWhitePoster";
import { AICodePoster } from "./AICodePoster";
import { CutePoster } from "./CutePoster";
import { MagazinePoster } from "./MagazinePoster";

/** Design width of all poster templates */
const POSTER_W = 1080;
/** Preview width inside the modal */
const PREVIEW_W = 340;
const SCALE = PREVIEW_W / POSTER_W;

const TEMPLATES: { id: PosterTemplate; label: string }[] = [
  { id: "minimal-white", label: "Notion风格" },
  { id: "ai-code", label: "Claude风格" },
  { id: "cute", label: "RED风格" },
  { id: "magazine", label: "Monocle风格" },
];

function bgForTemplate(t: PosterTemplate): string {
  switch (t) {
    case "ai-code":
      return "#0d1117";
    case "cute":
      return "#fef6f0";
    case "magazine":
      return "#faf9f6";
    default:
      return "#ffffff";
  }
}

export function PosterPreviewModal({
  data,
  onClose,
  onRegenerate,
}: {
  data: PosterData;
  onClose: () => void;
  onRegenerate?: () => void;
}) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const activeTemplate = TEMPLATES[activeIdx].id;

  const renderTemplate = (tmpl: PosterTemplate) => {
    switch (tmpl) {
      case "ai-code":
        return <AICodePoster data={data} />;
      case "cute":
        return <CutePoster data={data} />;
      case "magazine":
        return <MagazinePoster data={data} />;
      case "minimal-white":
      default:
        return <MinimalWhitePoster data={data} />;
    }
  };

  /* ── Measure export node for preview height ── */
  const [previewH, setPreviewH] = useState(0);
  const measure = useCallback(() => {
    if (exportRef.current) {
      setPreviewH(exportRef.current.scrollHeight * SCALE);
    }
  }, []);

  useEffect(() => {
    measure();
    const t = setTimeout(measure, 300);
    return () => clearTimeout(t);
  }, [measure, data, activeIdx]);

  /* ── Keyboard nav ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setActiveIdx((i) => (i - 1 + TEMPLATES.length) % TEMPLATES.length);
      if (e.key === "ArrowRight")
        setActiveIdx((i) => (i + 1) % TEMPLATES.length);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── Stable image export ── */
  const handleSave = async () => {
    const node = exportRef.current;
    if (!node) return;
    setIsSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      if ("fonts" in document) await document.fonts.ready;
      const imgs = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete ||
            new Promise<void>((r) => {
              img.onload = () => r();
              img.onerror = () => r();
            })
        )
      );
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const w = node.scrollWidth;
      const h = node.scrollHeight;
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: bgForTemplate(activeTemplate),
        logging: false,
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
        scrollX: 0,
        scrollY: 0,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.bookTitle || "BookLeap"}-海报.png`;
      a.click();
    } catch (err) {
      console.error("海报导出失败:", err);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Carousel item style ── */
  const THUMB_W = 160;
  const THUMB_SCALE = THUMB_W / POSTER_W;

  const getCarouselStyle = (
    idx: number
  ): {
    transform: string;
    opacity: number;
    zIndex: number;
    pointerEvents: "auto" | "none";
  } => {
    const diff =
      ((idx - activeIdx + TEMPLATES.length) % TEMPLATES.length + TEMPLATES.length) %
      TEMPLATES.length;
    // Normalize to -N/2 .. N/2
    const offset =
      diff > TEMPLATES.length / 2 ? diff - TEMPLATES.length : diff;

    if (offset === 0) {
      return {
        transform: "translateX(0) scale(1) rotateY(0deg)",
        opacity: 1,
        zIndex: 10,
        pointerEvents: "auto",
      };
    }
    const sign = offset > 0 ? 1 : -1;
    const abs = Math.abs(offset);
    if (abs === 1) {
      return {
        transform: `translateX(${sign * 200}px) scale(0.82) rotateY(${-sign * 12}deg)`,
        opacity: 0.6,
        zIndex: 5,
        pointerEvents: "auto",
      };
    }
    // Further items — hidden behind
    return {
      transform: `translateX(${sign * 320}px) scale(0.65) rotateY(${-sign * 20}deg)`,
      opacity: 0.25,
      zIndex: 1,
      pointerEvents: "none",
    };
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxHeight: "96vh",
          gap: 20,
          width: "100%",
          maxWidth: 900,
        }}
      >
        {/* ── Hidden full-size export node ── */}
        <div
          style={{
            position: "fixed",
            left: -9999,
            top: 0,
            width: POSTER_W,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <div ref={exportRef}>{renderTemplate(activeTemplate)}</div>
        </div>

        {/* ── Active template label ── */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: 2,
            margin: 0,
          }}
        >
          {TEMPLATES[activeIdx].label}
        </p>

        {/* ── Main preview (center) ── */}
        <div
          style={{
            overflow: "auto",
            maxHeight: "calc(96vh - 200px)",
            borderRadius: 16,
            boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
            background: bgForTemplate(activeTemplate),
          }}
        >
          <div
            style={{
              width: PREVIEW_W,
              height: previewH || "auto",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                transformOrigin: "top left",
                transform: `scale(${SCALE})`,
                width: POSTER_W,
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              {renderTemplate(activeTemplate)}
            </div>
          </div>
        </div>

        {/* ── Carousel thumbnails ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: 100,
            perspective: 800,
            position: "relative",
          }}
        >
          {TEMPLATES.map((tmpl, idx) => {
            const cs = getCarouselStyle(idx);
            return (
              <div
                key={tmpl.id}
                onClick={() => setActiveIdx(idx)}
                style={{
                  position: "absolute",
                  width: THUMB_W,
                  height: 90,
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 350ms ease-in-out",
                  transform: cs.transform,
                  opacity: cs.opacity,
                  zIndex: cs.zIndex,
                  pointerEvents: cs.pointerEvents,
                  boxShadow:
                    cs.zIndex === 10
                      ? "0 4px 20px rgba(0,0,0,0.4)"
                      : "0 2px 8px rgba(0,0,0,0.2)",
                  border:
                    cs.zIndex === 10
                      ? "2px solid rgba(255,255,255,0.6)"
                      : "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {/* Tiny poster thumbnail */}
                <div
                  style={{
                    transformOrigin: "top left",
                    transform: `scale(${THUMB_SCALE})`,
                    width: POSTER_W,
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  {renderTemplate(tmpl.id)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 28px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            关闭
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                padding: "10px 28px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              重新生成内容
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "10px 28px",
              borderRadius: 12,
              border: "none",
              background: isSaving ? "#6b7280" : "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              color: isSaving ? "#ffffff" : "#111827",
              cursor: isSaving ? "default" : "pointer",
            }}
          >
            {isSaving ? "保存中…" : "保存海报"}
          </button>
        </div>
      </div>
    </div>
  );
}
