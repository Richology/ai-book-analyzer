"use client";

import type { PosterData } from "./types";
import { computeDensity, df, dl, ds } from "./density";

const SERIF =
  "'Georgia','Noto Serif SC','PingFang SC','Times New Roman',serif";
const SANS =
  "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

const BG = "#faf9f6";
const BLACK = "#111111";
const BODY = "#2d2d2d";
const MUTED = "#888888";
const YELLOW = "#f5c400";
const RULE = "#e8e6e1";

export function MagazinePoster({ data }: { data: PosterData }) {
  const { content } = data;
  const d = computeDensity(content);

  const sections: { label: string; items: string[] }[] = [];
  if (content.summary) {
    sections.push({ label: "核心观点", items: [content.summary] });
  }
  if (content.insights.length > 0) {
    sections.push({ label: "关键洞察", items: content.insights });
  }
  if (content.actions.length > 0) {
    sections.push({ label: "行动建议", items: content.actions });
  }

  const NUM = ["01", "02", "03"];

  return (
    <div
      style={{
        width: 1080,
        minHeight: 1440,
        fontFamily: SERIF,
        background: BG,
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        color: BLACK,
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          padding: `${ds(56, d)}px 100px 0`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 700,
            color: MUTED,
            margin: 0,
            letterSpacing: 6,
          }}
        >
          BOOK INSIGHT
        </p>
        {/* Decorative toggle */}
        <div
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: BLACK,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#ffffff",
              position: "absolute",
              top: 3,
              right: 3,
            }}
          />
        </div>
      </div>

      {/* ── Yellow accent ── */}
      <div style={{ padding: `${ds(22, d)}px 100px 0` }}>
        <div style={{ width: 56, height: 5, background: YELLOW }} />
      </div>

      {/* ── Title ── */}
      <div style={{ padding: `${ds(26, d)}px 100px 0` }}>
        <h1
          style={{
            fontSize: df(60, d),
            fontWeight: 700,
            color: BLACK,
            lineHeight: 1.2,
            margin: 0,
            letterSpacing: -1,
            wordBreak: "break-word",
          }}
        >
          {data.bookTitle}
        </h1>
        {content.hook && (
          <p
            style={{
              fontFamily: SANS,
              fontSize: df(19, d),
              color: MUTED,
              margin: `${ds(14, d)}px 0 0`,
              lineHeight: dl(1.5, d),
            }}
          >
            {content.hook}
          </p>
        )}
      </div>

      {/* ── Black rule ── */}
      <div style={{ padding: `${ds(36, d)}px 100px 0` }}>
        <div style={{ height: 2, background: BLACK }} />
      </div>

      {/* ── Content sections ── */}
      <div style={{ padding: "0 100px", flex: 1 }}>
        {sections.map((sec, i) => (
          <div key={i} style={{ marginTop: ds(40, d) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 4,
                  height: 24,
                  background: YELLOW,
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 15,
                  fontWeight: 700,
                  color: BLACK,
                  margin: 0,
                  letterSpacing: 4,
                }}
              >
                {NUM[i]}{"  "}{sec.label}
              </p>
            </div>
            <div
              style={{
                marginTop: ds(14, d),
                marginBottom: ds(18, d),
                height: 1,
                background: RULE,
              }}
            />
            {sec.items.map((line, j) => (
              <p
                key={j}
                style={{
                  fontSize: df(25, d),
                  lineHeight: dl(2, d),
                  color: BODY,
                  margin: j > 0 ? `${ds(16, d)}px 0 0` : 0,
                }}
              >
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* ── Bottom ── */}
      <div
        style={{
          padding: `${ds(48, d)}px 100px ${ds(56, d)}px`,
          marginTop: ds(40, d),
          borderTop: `2px solid ${BLACK}`,
        }}
      >
        <p
          style={{
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 700,
            color: BLACK,
            margin: 0,
            letterSpacing: 5,
          }}
        >
          BOOKLEAP
        </p>
        <p
          style={{
            fontFamily: SANS,
            fontSize: 11,
            color: MUTED,
            margin: "8px 0 0",
            letterSpacing: 1,
          }}
        >
          从好书中完成认知跃迁
        </p>
      </div>
    </div>
  );
}
