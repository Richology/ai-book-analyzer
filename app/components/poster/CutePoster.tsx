"use client";

import type { PosterData } from "./types";
import { computeDensity, df, dl, ds } from "./density";

const FONT =
  "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

const BG_TOP = "#fef6f0";
const BG_BOT = "#fdf2f8";
const TITLE = "#3f3f46";
const BODY = "#52525b";
const MUTED = "#a1a1aa";
const ACCENT = "#f97316";
const HIGHLIGHT_BG = "#fff7ed";
const HIGHLIGHT_BORDER = "#fed7aa";
const DIVIDER = "#fde68a";

export function CutePoster({ data }: { data: PosterData }) {
  const { content } = data;
  const d = computeDensity(content);

  return (
    <div
      style={{
        width: 1080,
        minHeight: 1440,
        fontFamily: FONT,
        background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOT} 100%)`,
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        color: TITLE,
      }}
    >
      {/* ── Top label ── */}
      <div style={{ padding: `${ds(56, d)}px 88px 0` }}>
        <p
          style={{
            fontSize: 17,
            color: MUTED,
            margin: 0,
            letterSpacing: 2,
            fontWeight: 500,
          }}
        >
          📚{"  "}一句话读懂这本书
        </p>
      </div>

      {/* ── Book title ── */}
      <div style={{ padding: `${ds(30, d)}px 88px 0` }}>
        <h1
          style={{
            fontSize: df(52, d),
            fontWeight: 800,
            color: TITLE,
            lineHeight: 1.35,
            margin: 0,
            wordBreak: "break-word",
          }}
        >
          {data.bookTitle}
        </h1>
        <div
          style={{
            marginTop: ds(20, d),
            width: 40,
            height: 4,
            borderRadius: 2,
            background: ACCENT,
            opacity: 0.7,
          }}
        />
      </div>

      {/* ── Highlight callout ── */}
      {content.highlight && (
        <div style={{ padding: `${ds(32, d)}px 88px 0` }}>
          <div
            style={{
              background: HIGHLIGHT_BG,
              border: `2px solid ${HIGHLIGHT_BORDER}`,
              borderRadius: 16,
              padding: `${ds(26, d)}px 32px`,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: ACCENT,
                fontWeight: 700,
                margin: 0,
                letterSpacing: 2,
              }}
            >
              ✦ 一句话总结
            </p>
            <p
              style={{
                fontSize: df(28, d),
                fontWeight: 700,
                lineHeight: dl(1.6, d),
                color: TITLE,
                margin: `${ds(12, d)}px 0 0`,
              }}
            >
              「{content.highlight}」
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1: 这本书在讲什么 ── */}
      {content.summary && (
        <div style={{ padding: `${ds(34, d)}px 88px 0` }}>
          <p style={{ fontSize: df(26, d), fontWeight: 700, color: TITLE, margin: 0 }}>
            ✨ 这本书在讲什么
          </p>
          <div
            style={{
              marginTop: ds(12, d),
              marginBottom: ds(16, d),
              height: 2,
              borderRadius: 1,
              background: DIVIDER,
              width: 56,
            }}
          />
          <p
            style={{
              fontSize: df(24, d),
              lineHeight: dl(1.95, d),
              color: BODY,
              margin: 0,
            }}
          >
            {content.summary}
          </p>
        </div>
      )}

      {/* ── Section 2: 我学到的重点 ── */}
      {content.insights.length > 0 && (
        <div style={{ padding: `${ds(34, d)}px 88px 0` }}>
          <p style={{ fontSize: df(26, d), fontWeight: 700, color: TITLE, margin: 0 }}>
            💡 我学到的{content.insights.length}个重点
          </p>
          <div
            style={{
              marginTop: ds(12, d),
              marginBottom: ds(16, d),
              height: 2,
              borderRadius: 1,
              background: DIVIDER,
              width: 56,
            }}
          />
          {content.insights.map((item, i) => (
            <p
              key={i}
              style={{
                fontSize: df(23, d),
                lineHeight: dl(1.9, d),
                color: BODY,
                margin: "0",
                marginTop: i > 0 ? ds(16, d) : 0,
              }}
            >
              <span style={{ color: ACCENT, fontWeight: 700, marginRight: 10 }}>
                {i + 1}.
              </span>
              {item}
            </p>
          ))}
        </div>
      )}

      {/* ── Section 3: 可以立刻用的行动 ── */}
      {content.actions.length > 0 && (
        <div style={{ padding: `${ds(34, d)}px 88px 0`, flex: 1 }}>
          <p style={{ fontSize: df(26, d), fontWeight: 700, color: TITLE, margin: 0 }}>
            🧠 可以立刻用的行动
          </p>
          <div
            style={{
              marginTop: ds(12, d),
              marginBottom: ds(16, d),
              height: 2,
              borderRadius: 1,
              background: DIVIDER,
              width: 56,
            }}
          />
          {content.actions.map((item, i) => (
            <p
              key={i}
              style={{
                fontSize: df(23, d),
                lineHeight: dl(1.9, d),
                color: BODY,
                margin: "0",
                marginTop: i > 0 ? ds(16, d) : 0,
              }}
            >
              <span style={{ color: ACCENT, fontWeight: 700, marginRight: 10 }}>→</span>
              {item}
            </p>
          ))}
        </div>
      )}

      {/* ── Bottom ── */}
      <div
        style={{
          padding: `${ds(44, d)}px 88px ${ds(48, d)}px`,
          marginTop: ds(36, d),
          borderTop: `2px solid ${DIVIDER}`,
        }}
      >
        <p style={{ fontSize: 14, color: MUTED, margin: 0, letterSpacing: 1 }}>
          书跃 · BookLeap
        </p>
        <p style={{ fontSize: 11, color: MUTED, margin: "6px 0 0", opacity: 0.6 }}>
          从好书中完成认知跃迁
        </p>
      </div>
    </div>
  );
}
